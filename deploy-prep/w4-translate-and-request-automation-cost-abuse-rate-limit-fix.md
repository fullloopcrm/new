# W4 Report — admin/translate + settings/request-automation cost/abuse rate-limit fix

**Branch:** p1-w4
**Scope:** file-only, no push/deploy/DB writes

## What was found

Continuing the controlled broad-hunt over lower-risk API surface. The prior
RBAC-gate sweep (`w4-analytics-live-feed-and-sidebar-leads-count-rbac-gate-fix.md`)
flagged two routes as a different class of gap — not a permission/data-exposure
issue, but missing abuse/cost controls — and deferred them as follow-ups:

1. **`POST /api/admin/translate`** — any authenticated tenant member could call
   this to trigger a paid Anthropic API call against the tenant's stored key,
   with **no rate limit and no length cap** on the input text. A scripted
   caller could loop this to run up real API spend, or submit an arbitrarily
   large `text` body driving up per-call token cost.
2. **`POST /api/settings/request-automation`** — already truncates `title`/
   `description`, but had **no rate limit**. Any authenticated tenant member
   could script repeated calls to spam the platform team's inbox
   (`ADMIN_NOTIFICATION_EMAIL`).

Both routes are correctly scoped to the caller's own tenant already (no RBAC
gate needed — any tenant member may legitimately request a translation or an
automation trigger) — the gap is purely missing throttling.

## Fix

1. `admin/translate/route.ts` — added a 5000-char cap on `text` (400 on
   violation) and a per-tenant rate limit (`rateLimitDb`, 30 requests / 10 min,
   keyed on `tenantId`), matching the existing `rateLimitDb` pattern already
   used for paid-AI-call abuse control elsewhere (e.g. `POST /api/chat`).
2. `settings/request-automation/route.ts` — added a per-tenant rate limit
   (5 requests / hour), same utility.

## Verification

- Added `route.rate-limit.test.ts` for both routes: rate-limit-exhausted → 429
  (and, for translate, oversized text → 400), normal request → 200/success.
  New tests pass: `5 passed (5)`.
- `npx tsc --noEmit` — clean, no errors.
- Re-ran existing tests in both touched directories — all pass.

## Not touched (reviewed, judged lower-value or out of scope for this pass)

- `ai/chat` and `ai/assistant` also make paid Anthropic calls with no explicit
  rate limit, but both are tool-gated/permission-scoped already (per the prior
  report) and are higher-touch surfaces (multi-turn conversation state,
  existing tool-call plumbing) — flagging as a possible follow-up rather than
  bundling into this lower-risk pass.
- Full re-sweep of all `getTenantForRequest()`-only routes (no
  `requirePermission`) found no remaining unreviewed routes — the 18 present
  in the codebase were all already accounted for in prior W4 reports as
  intentionally open, redacted, or (for `admin/cleaner-availability`) gated at
  the higher `requireAdmin()` (platform-admin) tier already.

No push, deploy, or DB migration performed.
