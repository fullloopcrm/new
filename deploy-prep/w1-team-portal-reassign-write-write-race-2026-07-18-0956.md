# team-portal reassign: unguarded write-write race could desync bookings.team_member_id from booking_team_members lead (2026-07-18 09:56)

## Bug
`POST /api/team-portal/jobs/reassign` read `bookings.team_member_id` (as
`previous`), then unconditionally wrote `team_member_id: to_member_id` keyed
only on `id`+`tenant_id` — no compare-and-swap re-asserting the row still
held `previous` at write time. Every other `team_member_id` write site fixed
elsewhere this session guards its claim (claim's `.is('team_member_id', null)`
first-writer-wins, deal-stage/quote-accept's `.eq('stage', dealRow.stage)`
CAS) — reassign was the one write path still doing a blind update.

The route also syncs `booking_team_members` (the real source GET
`/api/bookings/:id/team` and closeout-summary read the lead from) via a
separate, unguarded delete+upsert pair immediately after the bookings write.

Two managers/leads reassigning the SAME job to two different targets within
the same window can interleave: both pass the initial fetch with the same
`previous`, both bookings updates land (last one wins), but each request's
own delete+upsert pair on `booking_team_members` is NOT ordered against the
other's. If the loser's delete+upsert lands after the winner's, the two
tables end up pointing at different members — `bookings.team_member_id`
says one thing, `booking_team_members.lead` says another — the exact
desync class already fixed at every other write site (claim, cron/generate-
recurring refill, the regenerate route, admin exception reassign) this
session, just reachable here via a write-write race instead of a missing
sync entirely. Downstream effect: the admin Team panel and closeout payout
attribution can silently point at the wrong crew member after two near-
simultaneous field reassigns.

## Fix (file-only, no push/deploy/DB)
`src/app/api/team-portal/jobs/reassign/route.ts` — CAS the bookings update
on the pre-read `team_member_id`: `.eq('team_member_id', previous)` when
non-null, `.is('team_member_id', null)` when null (real Supabase/PostgREST
`.eq(col, null)` does NOT match `IS NULL` — same null-handling as claim's
own `.is()` guard, not a plain ternary into `.eq()`). On a lost race, return
409 with the booking's real current `team_member_id` instead of clobbering
it; the loser never reaches the `booking_team_members` delete+upsert, so
that pair can no longer land out of order against the winner's.

## Tests
`src/app/api/team-portal/jobs/reassign/route.race.test.ts` (new file), 3
cases:
- Concurrent reassign already moved the job to a third member between this
  request's read and write → 409, and both `bookings.team_member_id` and
  `booking_team_members.lead` still point at the concurrent winner (no
  desync).
- No concurrent writer → still reassigns normally (200), no regression.
- `previous` is null (never-assigned job) → CAS still succeeds via
  `.is('team_member_id', null)`, not silently blocked by a broken `eq(null)`.

RED-confirmed: race case failed (200 instead of 409, desync reproduced)
against pre-fix code. GREEN after the fix. Full `team-portal/` suite: 21
files / 63 tests pass, 0 regressions. `tsc --noEmit` clean on the touched
file (pre-existing unrelated baseline errors elsewhere untouched).

## Verification
- `npx vitest run src/app/api/team-portal/jobs/reassign/` — 2 files / 4
  tests pass.
- `npx vitest run src/app/api/team-portal/` — 21 files / 63 tests pass.
- `npx tsc --noEmit --pretty false` — 0 errors referencing `reassign`; same
  4 pre-existing unrelated errors elsewhere (admin-auth route typing,
  cron/outreach + payment-reminder test signature drift, untracked
  sunnyside-clean-nyc site-nav.ts — none touched by this fix).
- File-only. No push, no deploy, no DB migration (no schema change needed —
  this is a query-shape fix only).
