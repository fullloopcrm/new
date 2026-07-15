# W4 report — unmetered paid-Anthropic-call endpoints (cost-abuse gap)

**Date:** 2026-07-15 (session ~19:16 LEADER order — "continue broad-hunt, lower-risk surface")
**Branch:** p1-w4
**Commit:** 8c6535fe
**Status:** File-only. tsc clean, tests pass. No push/deploy/DB.

## What I was looking for

~20+ prior broad-hunt passes on this branch (see LEADER-CHANNEL.md history)
had already covered auth/RBAC/IDOR, timing-unsafe secret compares, weak RNG,
CSV/HTML injection, webhook signature verification, upload MIME whitelists,
SSRF guards, and PostgREST filter injection across the codebase. This pass
needed a genuinely fresh angle rather than re-treading that ground.

Re-ran several "no results" searches that had actually failed at the shell
level (zsh eating `--include=*.ts` as a literal glob before grep ran) —
confirmed as true negatives once re-run correctly: no `eval`/`Function`/
`child_process`, no raw `fs.readFile`/`writeFile` in API routes, no JWT
library usage (Clerk handles auth), no prototype-pollution merge patterns.
IMAP/mailparser email ingestion (comhub) strips all HTML tags before storage
and render paths use JSX text interpolation (React-escaped) — clean.

## What I found

Grepped every API route calling `anthropicFromStoredKey()` / `new Anthropic()`
(the tenant-or-platform-key resolution helper) and cross-checked which ones
already call `rateLimitDb`. Found `admin/translate/route.ts` already has this
exact mitigation, with an explicit comment: *"Any authenticated tenant member
can trigger this paid Anthropic call with no cost control; cap per-tenant
volume so a scripted caller can't run up unbounded API spend against the
tenant's stored key."* That comment identifies the bug class precisely — but
6 sibling routes making the same kind of paid call had no such guard:

| Route | Auth gate | Cost per call |
|---|---|---|
| `POST /api/ai/assistant` | any tenant member (`getTenantForRequest`) | up to 10 tool-use iterations, 1024 max_tokens each |
| `POST /api/ai/chat` | any tenant member | 1 call, 1024 max_tokens |
| `POST /api/finance/ai-ask` | `finance.expenses` permission | 1 call, 600 max_tokens |
| `POST /api/admin/ai-chat` | any tenant member | up to 10 tool-use iterations, 1024 max_tokens each |
| `POST /api/admin/campaigns/generate` | `campaigns.create` permission | 1 call, 4096 max_tokens |
| `POST /api/admin/google/generate-reply` | `reviews.request` permission | 1 call, 200 max_tokens |

All 6 fall back to the platform's shared `ANTHROPIC_API_KEY` when a tenant
hasn't configured their own key (the normal case — most tenants haven't set
one). None had any request volume cap. Any authenticated account — including
low-privilege roles like `staff` that already have RBAC-gated write access
revoked on these same routes' tool-use paths — could script a tight loop
against these endpoints and run up real, unbounded Anthropic API spend on
Jeff's platform billing. This is a billing/resource-exhaustion risk, not an
IDOR/data-exposure one, so it wasn't caught by any of the prior passes' RBAC
or data-scoping sweeps.

`cron/anthropic-health` also calls Anthropic with no rate limit, but it's
CRON_SECRET-gated and not attacker-triggerable on demand — left it alone.

## Fix applied

Added the exact same convention already established at `admin/translate`:
`rateLimitDb(`<route-name>:${tenantId}`, 30, 10 * 60 * 1000)` — 30 requests
per 10 minutes per tenant, returning 429 with a clear message when exceeded.
30/10min is generous for real usage (a chat conversation, one campaign draft,
one review reply) while bounding a scripted abuse loop to a fixed, small
multiple of normal cost instead of unbounded.

Files changed:
- `src/app/api/ai/assistant/route.ts`
- `src/app/api/ai/chat/route.ts`
- `src/app/api/finance/ai-ask/route.ts`
- `src/app/api/admin/ai-chat/route.ts`
- `src/app/api/admin/campaigns/generate/route.ts`
- `src/app/api/admin/google/generate-reply/route.ts`

## Test fallout + fix

4 existing RBAC test files for `ai/assistant` and `admin/ai-chat`
(`route.rbac.test.ts`, `route.read-tools-rbac.test.ts`) mock `@/lib/supabase`
with a restrictive hand-rolled query-builder chain that didn't implement
`.gte()` or `.insert()`. Once these routes started calling `rateLimitDb`
(which uses `.eq().gte()` for the count query and `.insert()` to record the
attempt), those mocks threw `TypeError: ... .gte is not a function`,
surfacing as 16 test failures (500 instead of 200). Extended each of the 4
mocks' chain object with `insert: () => c` and `gte: () => c` stubs — same
pattern already used for `eq`/`select`/etc in those mocks — so the rate-limit
call resolves against an empty/mocked `rate_limit_events` table instead of
throwing. This is required scaffolding for the tests to reflect the new
production code path, not a change to what's being asserted.

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` on all 7 affected test files (assistant ×3, ai/chat,
  finance/ai-ask, admin/ai-chat ×3, admin/campaigns/generate,
  admin/google/generate-reply, admin/translate) — 23/23 passed after the mock
  fix (16 had failed before it).
- Broader sweep: `npx vitest run` across `src/app/api/ai`,
  `src/app/api/finance`, `src/app/api/admin/ai-chat`,
  `src/app/api/admin/campaigns`, `src/app/api/admin/google`,
  `src/app/api/admin/translate` — 53/53 passed, no regressions.

File-only. No push/deploy/DB. `rate_limit_events` table already exists in
prod (migration 014_security_hardening.sql, used by `admin/translate` and
~40 other sites already) — no new schema needed.
