# 3 single-use verification/reset codes had no CAS on consumption — a TOCTOU race let one code authenticate/reset twice (2026-07-18 12:13)

## Bug
Three separate login/reset flows store a single-use code, read it with a
`used=false` (or, for `verification_codes`, existence) filter, then "consume"
it in a second, later step — but none of the three re-asserted the unused
condition in that second write's own WHERE clause, and none checked whether
the write actually affected a row:

- `POST /api/portal/auth` (`verify_code`, client-portal login) — SELECT
  `portal_auth_codes` WHERE `used=false`, then `UPDATE ... SET used=true`
  scoped only by `phone`+`code`+`tenant_id` (no `used=false` re-check), result
  never checked, THEN mint a session token.
- `POST /api/pin-reset` (`verify_and_set`, team-member PIN self-reset) — same
  shape against `member_pin_reset_codes`, but worse: the OLD code wrote
  `tenant_members.pin_hash` **unconditionally, with no CAS at all**, and only
  marked the code used in a separate write AFTER that, also uncoupled from
  the PIN write and also unchecked.
- `POST /api/client/verify-code` (client dashboard login) — SELECT
  `verification_codes` (which has an unused `used` boolean column — the table
  was clearly designed for the same flag pattern as the other two, but this
  route "burns" the code via `DELETE` instead), then an unconditional
  `DELETE ... WHERE tenant_id+identifier` (not even scoped by `code`), result
  never checked.

Two concurrent requests presenting the *same still-valid code* both pass the
SELECT before either write lands (classic TOCTOU) — the write's own WHERE is
what should stop the second one, and in all three routes it didn't. Impact
scales with the write that follows:
- portal/auth and client/verify-code: one single-use login code could mint
  two separate sessions.
- pin-reset: a leaked/observed code raced against the legitimate owner's own
  concurrent request could let the LAST writer's `new_pin` silently win —
  last-write-wins on a login credential, plus the used-flag write (unchecked,
  uncoupled from the PIN write) could re-flip an already-consumed code back
  to consumable.

Same "no CAS on a state transition" class fixed repeatedly elsewhere this
session (`bookings.team_member_id`, `client_properties.is_primary`,
`entities.is_default`, `booking_team_members.is_lead`) — never swept to
single-use auth/reset codes specifically, which turned out to have the
identical gap under a different name.

## Fix (file-only, no push/deploy/DB)
- `src/app/api/portal/auth/route.ts` — the "mark used" UPDATE now adds
  `.eq('used', false)` to its own WHERE and reads the result via
  `.select().maybeSingle()`. If null (lost the race), returns `401 "Code
  already used — request a new one"` before minting a token.
- `src/app/api/pin-reset/route.ts` — reordered: the code is now consumed via
  a CAS UPDATE (`used=false` in the WHERE, `.select().maybeSingle()`)
  **before** `tenant_members.pin_hash` is ever touched. A lost race returns
  `400 "Code already used"` and the PIN write is never reached. Removed the
  old, now-redundant unconditional "mark used" write that used to run after
  the PIN update.
- `src/app/api/client/verify-code/route.ts` — the burn step is now a single
  CAS `DELETE` scoped to the exact matched `identifier`+`code` (not just
  `identifier`), with `.select()` to confirm a row actually came back. A lost
  race returns `401 "Code already used"`. The other lookup key (when both
  email+phone were sent) still gets best-effort cleanup, unguarded — it's
  hygiene, not the code that was actually validated.

## Test coverage
New `route.replay-race.test.ts` in all three route directories, each
injecting a concurrent `used=true` flip (or, for verify-code, a rival
CAS-delete) in the gap between the route's own initial read and its
consume-write — the same interleaving-hook pattern already established in
`quotes/[id]/route.status-race.test.ts`. RED-confirmed via `git apply -R` on
each fix in isolation (all 3 new "rejects the CAS-consume" tests failed
against pre-fix code — 200 instead of 401/400 — for the predicted reason),
GREEN after re-applying. Two pre-existing hand-rolled fakes in
`route.test.ts` and `route.pin-conflict.test.ts` for `client/verify-code`
had to be extended to model delete-with-`.select()` (RETURNING-equivalent)
semantics — without that, the fix's own CAS check would have made every
existing test in those files fail closed regardless of a real race, since
the old fakes only ever resolved `{data: null}` for any write.

## Sibling sweep
Grepped the whole app for `used: false` / `used=false` / any `'used'`
column reference outside tests — exactly these 3 sites exist. No other
single-use-code table in the schema.

## Verification
- `pin-reset/`, `portal/auth/`, `client/verify-code/`, `client/send-code/`:
  10 test files, 33 tests, all green.
- `npx tsc --noEmit` clean relative to session baseline (4 pre-existing
  unrelated errors: admin-auth route, 2 unrelated cron race tests,
  site-nav.ts — none touched by this pass).
- `npx eslint` on all touched files: 0 errors, 0 warnings.
