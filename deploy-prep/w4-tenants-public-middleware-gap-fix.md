# W4 Report — `/api/tenants/public` middleware registration gap, closed

**Branch:** p1-w4
**Scope:** file-only, no push/deploy/DB writes
**Trigger:** LEADER 15:55 order — "Continue broad-hunt, lower-risk surface. File-only, no push/deploy/DB."

## What was found

Swept the outstanding `deploy-prep/*.md` recon docs for items explicitly
flagged as found-but-not-yet-applied ("leader/Jeff-gated", "not applied",
`it.fails` witness tests still open). Most turned out to have already been
fixed in earlier sessions on this branch (confirmed by reading current code,
not just the docs — the docs themselves are stale in places):

- `postgrest-filter-injection-branch-audit.md` (6 RAW `.or()`/`.ilike()` sites
  on w4) — already sanitized via `sanitizePostgrestValue()`, commit `3daefc2b`.
- `idor-remediation-status.md` NEEDS-FIX #3 (Selena reset-insert missing
  `tenant_id`) — already fixed, insert now goes through `tenantDb(tenantId)`,
  witness test already converted from `it.fails` to a real assertion.
- `w4-comhub-email-backfill-cross-tenant-leak-audit.md` (CRITICAL —
  nycmaid's mailbox mirrored into whatever tenant was impersonating) —
  already fixed via `resolveTenantMailAccount(tenantId)`.
- `w4-team-portal-checkout-replay-pay-inflation-audit.md`,
  `w4-team-portal-reassign-cross-crew-hijack-and-checkin-carryover-audit.md`,
  `w4-waitlist-public-endpoint-ineffective-rate-limit-sms-cost-audit.md` — all
  marked FIXED in-doc or confirmed fixed by reading current code
  (`rateLimitDb` wired into `waitlist/route.ts`, etc).
- `w4-stripe-platform-webhook-duplicate-tenant-race-audit.md` — genuinely
  still open, but explicitly requires a DB migration + design call
  (idempotency ledger / row lock), out of this file-only, DB-free lane.
  Left untouched.

One item was still genuinely open and squarely in scope: **the
`/api/tenants/public` middleware-registration gap**
(`deploy-prep/tenants-public-route-not-registered.md`,
`branch-changelog-p1-w4.md` §2 last row — the only "Open" witness test
remaining from the prior round).

`src/app/api/tenants/public/route.ts` (public slug→tenant lookup, no PII,
`{name, slug, logo_url}` only) has zero auth logic — written to be public —
but was missing from `isPublicRoute` in `src/middleware.ts`. On the main host
every request 307-redirected to `/sign-in` before the route handler ever ran.
Fails closed (no data leak), MEDIUM severity, previously held as
leader/Jeff-gated pending sign-off on a middleware change. A regression
witness (`src/middleware.tenants-public-not-public.witness.test.ts`,
`it.fails`) was already written and fully speced the fix.

## Fix

1. `src/middleware.ts` — added `'/api/tenants/public(.*)'` to the
   `isPublicRoute` matcher, next to the existing `/api/tenant-sitemap` entry.
   One line, no handler change (the route's own 400/404 validation was
   already correct).
2. `src/middleware.tenants-public-not-public.witness.test.ts` — flipped the
   `it.fails` WITNESS case to a plain `it` (now a permanent regression lock)
   and updated the stale "STATUS: read-only, no middleware edit" doc comment
   to reflect the fix landing.

## Verification

- `npx tsc --noEmit` — clean, no errors.
- `npx vitest run src/middleware.tenants-public-not-public.witness.test.ts` —
  3 passed (3): the flipped regression test, the `/api/health` positive
  control, and the `/dashboard` contrast control (proves the harness still
  correctly distinguishes redirected vs. pass-through).
- Grepped for other tests asserting `/api/tenants/public` behavior — none
  exist outside this file, so no conflicting expectations elsewhere.
- This is the only `*.test.ts` under `src/middleware*` in the repo.

## Not touched

- `w4-stripe-platform-webhook-duplicate-tenant-race-audit.md` — real gap,
  needs a DB-level idempotency design call, out of this file-only/no-DB lane.
- Did not re-run the full test suite (large; touched surface is narrow and
  isolated to one middleware matcher entry + its own dedicated test file).

No push, deploy, or DB migration performed.
