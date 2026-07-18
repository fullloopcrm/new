# W4 — CPA year-end ZIP: missing rate limit on public-token download

**Date:** 2026-07-18 06:25
**Branch:** p1-w4 (file-only, no push/deploy/DB)

## Context

LEADER queue item (1): fresh-ground surface. Picked the CPA accountant-portal
download path (`platform/src/app/api/cpa/[token]/...`) — untouched by any
prior deploy-prep audit. `finance/cpa-tokens` (mint/list/revoke, session-authed)
was already hardened for the entity_id cross-tenant leak class. The public
consumption side, `GET /api/cpa/[token]/year-end-zip`, had never been looked at.

## Finding

`year-end-zip/route.ts` is a public, token-authed GET: given a
`cpa_access_tokens.token` (192-bit random, no session), it pages through up
to 200k `journal_lines` rows, builds a trial balance + general ledger, zips
both to CSV, and streams the file back. No `rateLimitDb` call anywhere in
the route.

Every sibling public-token route in this codebase caps itself per-token
(`invoices/public/[token]/checkout`, `quotes/public/[token]/deposit-checkout`,
plus the `referrals/track` / partner-requests fixes earlier in this branch).
This route is the most expensive of the bunch — a full paginated ledger
export + zip — yet was the one left uncapped. A looping caller with just the
link (leaked in an email thread, browser history, proxy log, etc.) could
hammer the DB with the heaviest read in the finance API with zero backoff:
resource-exhaustion DoS on Supabase, not credential-guessing (token entropy
already makes brute force infeasible).

Confirmed clean otherwise: token lookup checks `revoked_at` and `expires_at`
before use; `tenant_id`/`entity_id` come from the token row itself, never
from the client, so no cross-tenant leak; CSV cells go through
`finance-export.ts`'s `toCsv`/`csvEscape`, which already neutralizes formula
injection (fixed in an earlier pass) — ledger `memo` fields are safe.

## Fix

Added the same `rateLimitDb` convention used on the sibling public-token
checkout routes: `cpa-year-end-zip:${token}`, 20 requests / 10 minutes,
checked before the token lookup and before any DB read of journal data.

## Verification

- `npx tsc --noEmit --pretty false` — clean on the touched file (2
  pre-existing unrelated errors in `sunnyside-clean-nyc/_lib/site-nav.ts`
  confirmed present on `git stash` before this change too — not mine).
- `npx vitest run "src/app/api/cpa/[token]/year-end-zip/route.rate-limit.test.ts"` —
  2/2 pass (429 without touching the token row when limited; 200 + zip
  content-type when allowed). New test file, following the existing
  `invoices/public/[token]/checkout/route.rate-limit.test.ts` pattern.

## Surface closure

Checked for a duplicate-door sibling on this surface (session-authed UI vs.
public-token route, the pattern that's been the recurring class this
session): only one consumption route exists
(`dashboard/finance/cpa-access/page.tsx` calls the already-guarded
session-authed `finance/cpa-tokens` API; the public token only ever reaches
`year-end-zip`). No second route to check — surface closed with this one fix.

## Scope

File-only. No push/deploy/DB. 2 files changed
(`src/app/api/cpa/[token]/year-end-zip/route.ts`,
+1 new test file).
