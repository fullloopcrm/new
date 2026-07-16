# Referrer/Commission Unauthenticated PII+Financial Lookup — Ported to p1-w4

Continuation of LEADER 08:23 broad-hunt order (lower-risk surface, file-only,
no push/deploy/DB).

## Finding

`GET /api/referrers?code=|email=` and `GET /api/referral-commissions
?referrer_id=` were reachable with **no auth at all** on this branch
(rate-limited only). A caller who knew/guessed a referral code (small
keyspace: 4-letter name-prefix + 3 digits) or a referrer's email, or had a
referrer UUID, could pull `name/email/total_earned/total_paid/
preferred_payout` or a full commission ledger (client names + dollar
amounts) with zero session — real PII and financial data for live tenants
(nycmaid, wash-and-fold-nyc/hoboken, the-florida-maid, template).

This exact bug was already documented on this branch in
`deploy-prep/w4-referrer-portal-code-based-idor-audit.md` (an audit-only,
no-fix pass from an earlier broad-hunt) as needing a leader/Jeff product
call, since a naive backend gate alone would break 6 live self-service
referral portal pages that still called the endpoints unauthenticated.

While re-checking that finding, I found it had **already been found and
fully fixed on sibling worktrees** — p1-w1 (099a2e15, backend admin-gate),
p1-w2 (de252851, 6-page frontend OTP migration), and ported together onto a
third branch at 63c5c5e0 — but none of those commits were ancestors of this
branch's HEAD (`git merge-base --is-ancestor` confirmed NOT an ancestor for
all three). The vulnerability was still live here.

## Fix (ported from 63c5c5e0, adapted to this branch's file layout)

Attempted a direct `git cherry-pick -n 63c5c5e0` first; it conflicted (this
branch's `referrers/route.ts` already had independent `escapeLike()` work,
and this branch's test files were named/structured differently —
`route.ilike-injection.test.ts` / `route.ref-code-sync.test.ts` here vs.
`route.email-wildcard.test.ts` / `route.isolation.test.ts` on the source
branch). Aborted the cherry-pick, reset the affected paths, and applied the
same fix by hand:

- **Backend**: gated both `GET /api/referrers` (code/email lookup) and the
  `referrer_id` branch of `GET /api/referral-commissions` behind
  `requireAdmin()`. Added `failClosed: true` to the referrer-lookup rate
  limiter (PII oracle, same rationale as `client/check`).
- **Frontend**: migrated all 6 live `site/*/referral/page.tsx` clones
  (`site/referral`, `site/nycmaid/referral`, `site/template/referral`,
  `site/the-florida-maid/referral`, `site/wash-and-fold-hoboken/(app)/
  referral`, `site/wash-and-fold-nyc/(app)/referral`) off the unauthenticated
  lookup onto the already-hardened Bearer-token OTP flow (`/api/referrers/
  auth/request` + `/auth/verify` → token → `GET /api/referrers/[code]`,
  which already scopes commissions to the verified referrer and already
  returns the ledger inline — no second `referral-commissions` call needed).
  Verified this branch's `/api/referrers/[code]/route.ts` and the OTP
  request/verify routes already existed and matched the expected response
  shape before rewriting the pages.
- Adapted the two pre-existing `referrers/route.ts` test files (ilike-wildcard,
  ref-code-sync) to mock `requireAdmin` so they keep testing what they were
  written for instead of getting blocked by the new gate.
- Added `route.auth.test.ts` regression tests for both routes (ported from
  63c5c5e0) proving an unauthenticated `code=`/`email=`/`referrer_id=` lookup
  is rejected with 401 before any data is queried.

## Verification

- `npx tsc --noEmit`: clean (one pre-existing, unrelated failure in
  `bookings/broadcast/route.xss.test.ts` confirmed via `git stash` to exist
  before this change too — not touched by this fix).
- `npx eslint` on all touched files: 0 errors (6 benign "unused eslint-disable
  directive" warnings on the mount-effect suppression comment, identical
  profile to the already-shipped version of this same fix on the source
  branch).
- `npx vitest run` on `api/referrers`, `api/referral-commissions`, and all 6
  `site/*/referral` dirs: **10 files / 27 tests passing**, including the new
  auth-gate regressions.
- Confirmed via grep that no frontend code anywhere in the repo still calls
  `/api/referrers?code=|email=` or `/api/referral-commissions?referrer_id=`
  unauthenticated after the migration.

## Disposition of the stale audit doc

`deploy-prep/w4-referrer-portal-code-based-idor-audit.md` is now resolved on
this branch (option 1 from that doc — migrate the 6 pages to OTP — is what
landed, matching what already shipped on p1-w1/p1-w2). Leaving the original
audit file in place for history; this file documents the fix.

File-only, no push/deploy/DB.
