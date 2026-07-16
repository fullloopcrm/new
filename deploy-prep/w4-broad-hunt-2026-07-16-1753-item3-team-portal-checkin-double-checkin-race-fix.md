# W4 — Item 3 of 17:39 LEADER order: fresh ground — team-portal checkin double-checkin race

Time: 17:39 order, landed ~17:54. File-only, no push/deploy/DB.

## `POST /api/team-portal/checkin` double-checkin race

Found while closing out item 2 (`checkout`'s double-checkout race, same
order): `checkin` is checkout's sibling route in the exact same field-worker
flow and shares the identical shape — the 11:01 order added a
`status !== 'scheduled' && status !== 'confirmed'` guard here too, reading a
plain `SELECT` snapshot, but the actual `bookings` UPDATE that flips the
booking to `'in_progress'` was still **unconditional** (no `WHERE status IN
(...)`). Same double-tap-in-the-field / client-retry scenario as checkout:
two near-simultaneous check-in requests both read the pre-check-in
status/null `check_in_time` and both fall through.

Lower severity than checkout's version — `checkin` has no notify side
effects at all (no push, no SMS, no payment) — but it's a real lost-update:
whichever write lands last silently wins `check_in_time`/`check_in_lat`/
`check_in_lng`, and because both concurrent calls compute their optional
GPS-flag `notes` append from the *same* stale pre-update `notes` snapshot
rather than each other's write, a genuine GPS-drift flag from one of the two
calls can be silently dropped instead of both being recorded.

Fix: same technique as checkout — claim the `scheduled`/`confirmed ->
in_progress` transition atomically (`in('status', ['scheduled',
'confirmed'])` in the UPDATE's WHERE, `.select().maybeSingle()`); only the
winner's write lands, the loser gets a clean 409 instead of silently losing
its GPS-flag note or check-in timestamp to the other call.

## Verification

- New test `checkin/route.double-checkin-race.test.ts`, 3 tests: normal
  check-in flips status once; a fully-sequential second check-in is caught
  by the pre-existing `status` snapshot check (400, confirms no regression);
  `Promise.all([POST, POST])` concurrent race yields exactly one 200 + one
  409, and the booking ends up correctly checked in (not left in a
  half-written state).
- Mutation-tested: reverted `route.ts` only (`git stash`, test files kept)
  → the race test fails for the right reason (both concurrent calls return
  200 instead of one 409). Restored, all 3 pass.
- Existing `checkin/route.tenantdb.test.ts` (3 tests: tenant-isolation +
  status-guard coverage) required adding `in()` and `maybeSingle()` to its
  shared mock's update chain (alongside the existing `single()`) — no
  assertions changed, all 3 still pass.
- Full `src/app/api/team-portal/*` suite: 35 files / 143 passing, 1 skipped
  (pre-existing, unrelated), no regressions.
- `npx tsc --noEmit`: clean on changed files. Same 2 pre-existing unrelated
  errors as every prior report this session
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/site-nav.ts`).

## Files touched

- `platform/src/app/api/team-portal/checkin/route.ts` — atomic
  scheduled/confirmed->in_progress claim (~15 lines).
- `platform/src/app/api/team-portal/checkin/route.tenantdb.test.ts` — added
  `in()`/`maybeSingle()` to the shared mock update chain (required for the
  route change; no test assertions changed).
- `platform/src/app/api/team-portal/checkin/route.double-checkin-race.test.ts`
  — new, 3 tests.

## Scope note

This is the third and last item of the 17:39 queue: item 1
(`quotes/[id]/send`, committed aed1247b), item 2 (`team-portal/checkout`,
committed b02b548b), item 3 (this fix). All three are the same underlying
bug class (unconditional status-transition UPDATE after a plain-SELECT
snapshot check) found by sweeping sibling/related routes to ones already
fixed earlier this session — consistent with "continue sweeping" /
"continue archetype depth" / "continue hunting fresh ground" as one
connected thread rather than three unrelated finds this round.
