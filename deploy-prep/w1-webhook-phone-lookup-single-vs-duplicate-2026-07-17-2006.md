# .single() on unconstrained phone lookups silently no-oped on duplicates (2026-07-17 20:06)

## Surface
`clients.phone` and `team_members.phone` have no uniqueness constraint —
`idx_clients_tenant_phone` (migration `006_error_resilience.sql`) is a
plain index, not unique. This codebase has repeatedly needed `*_dedup`
migrations for duplicate rows this same session (payroll_payments,
partner_requests agreements, team_member_payouts), so duplicate phones on
`clients`/`team_members` are a demonstrated shape, not hypothetical.

`webhooks/telnyx/route.ts` already had a comment documenting this exact
failure class for its OWN tenant lookup ("Use limit(2), NOT .single():
.single() ERRORS when two tenants share a number... that took SMS down
during a cutover test") — but the fix was never extended to the file's
other 7 `clients`/`team_members` phone lookups, or to the other route in
the codebase with the same pattern.

## Bug 1 — webhooks/telnyx/route.ts (7 call sites)
STOP, START, YES/CONFIRM, the rating intercept, and the general-inbound
fallback all did `.eq('phone', from).single()` directly against `clients`/
`team_members`, uncaught error. A client with any duplicate phone row: STOP
never flipped `sms_consent` (TCPA gap — carrier delivers, our gate never
engages), YES/CONFIRM never confirmed their booking, rating replies never
recorded.

## Bug 2 — webhooks/portal/auth/route.ts's `send_code` (1 call site)
Same pattern on the `clients` lookup that resolves who's logging into the
customer portal. A legitimate client with a duplicate phone row got a
permanent 404 "No account found with this phone number" — locked out of
self-service portal login entirely. Same "legitimate user locked out of
self-service" shape as this session's earlier pin-reset fix, different
route.

`verify_code`'s own `portal_auth_codes` lookup was already correctly
guarded (`.order().limit(1).single()` — limit(1) caps the result before
`.single()` ever sees it, so it can't throw on 2+ rows); only the
`send_code` client lookup had the bug.

## Fix (file-only, no push/deploy/DB)
- `src/app/api/webhooks/telnyx/route.ts` — new `findByPhone()` helper
  (`.order('id').limit(2)`, pick first deterministically, `console.error`
  if ambiguous — same pattern the file's own tenant lookup already used).
  Replaces all 7 call sites.
- `src/app/api/portal/auth/route.ts` — same pattern applied inline to the
  one `send_code` call site.

## Tests
- `webhooks/telnyx/route.duplicate-phone.test.ts` (new) — two clients
  sharing a phone in the same tenant: STOP still flips `sms_consent` on one
  of them (not neither); YES still resolves+confirms the booking.
- `portal/auth/route.duplicate-phone.test.ts` (new) — two clients sharing a
  phone: `send_code` still returns 200/sent (not 404); a genuinely
  unmatched phone still correctly 404s (0-row case unaffected, proves the
  fix didn't loosen the real "no such account" response).
- Both mutation-verified: `git diff > patch`, `git apply -R` to revert
  (stash disabled, shared `.git` dir across workers), confirmed RED against
  pre-fix code with the exact predicted failure (STOP/YES no-op; 404
  instead of 200), restored, confirmed GREEN.

## Verification
- `tsc --noEmit`: 0 new errors on any touched file (4 pre-existing baseline
  errors elsewhere, unrelated).
- `eslint` on touched files: 0 issues.
- Targeted: `webhooks/telnyx/` (4/4) + `portal/auth/` (11/11) — 0
  regressions.
- Full suite (this round, after both fixes): 592→593 files. **3 test
  files failed on this run — confirmed pre-existing and unrelated to this
  round's diff**, see below.

## Noticed, not fixed this round — flagging per standing scope discipline
`dashboard/route.finance-redaction.test.ts`, `route.isolation.test.ts`,
`route.pin-redaction.test.ts` (7 tests total) fail right now, but:
- `git status` confirms zero uncommitted diff on `dashboard/route.ts` or
  its test files — not caused by anything touched this round.
- Root cause confirmed by direct repro: these 3 files all seed a "today"
  booking's `start_time` via `new Date().toISOString()` (a real UTC-zoned
  timestamp, e.g. `2026-07-18T00:04:24.xxxZ` right now). My own earlier
  commit `975d7db8` (this same branch, an earlier session) correctly fixed
  the dashboard aggregator to treat `start_time` as a **naive ET** string
  (matching how bookings are actually stored — no offset, ignores the
  trailing `Z`), same as every other day-boundary fix this session. That
  means the fixture's UTC-rolled-over date now reads as "tomorrow" in ET
  terms and falls outside "today's" window — 0 revenue, empty `todayJobs`,
  test fails.
- This is a **time-of-day-dependent test-fixture bug**, not a production
  bug: real booking `start_time` values are genuinely naive-ET in the DB,
  so the app-code fix is correct; only these 3 tests' fixture-construction
  pattern is wrong. It's live for roughly the daily 7-8pm–midnight
  ET window (whenever UTC's calendar date has rolled past ET's but the
  fixture still uses raw `new Date().toISOString()`), confirmed via
  `date -u` vs `TZ=America/New_York date` right now (00:04 UTC / 20:04 ET,
  July 18 vs July 17).
- Fix would be mechanical (seed `start_time` via a naive-ET constructor —
  e.g. this repo's existing `formatNaiveET`/`etToday` helpers from
  `lib/recurring.ts`, same as production code — instead of
  `new Date().toISOString()`) and touches test fixtures only, zero
  production risk. Not fixed this round — outside this round's authorized
  surface (phone-lookup `.single()` continuation), flagging per scope
  discipline rather than silently expanding into a 3rd unrelated fix.
  Matters beyond just these 3 tests: any worker's "full suite green"
  verification claim made during this same ET evening window is at risk of
  either a false alarm (like this one) or, worse, a real regression getting
  waved off as "the known flaky window" without checking. Worth a
  dedicated fix soon.

Commits: telnyx (f74bded3), portal/auth (pending this commit).
File-only. No push/deploy/DB.
