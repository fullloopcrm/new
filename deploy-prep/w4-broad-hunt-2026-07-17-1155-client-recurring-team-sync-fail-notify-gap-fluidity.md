# W4 broad-hunt — 2026-07-17 11:55 EDT — gap/fluidity checkpoint

Queue (11:46 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) continue scheduling/dispatch depth
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

This file is (3).

## Landing this pass (item 2, fresh ground)

`POST /api/client/recurring` (client-initiated recurring booking creation)
writes `booking_team_members` (lead + extras) as a best-effort follow-up
after the bookings themselves are created. A failure there was swallowed
with only `console.error` — no admin-visible surface, response still
returned `200` with `bookings_created > 0`.

Traced the real consequence rather than assuming "cosmetic bookkeeping":
`booking_team_members` is the *only* record of non-lead extras
(`bookings.team_member_id` carries just the lead), and three live
consumers read it:
- `admin/bookings/[id]/closeout-summary` — payout breakdown per team
  member. Falls back to lead-only when the table has no rows for a
  booking, so extras silently drop out of the payout summary.
- `team-portal/15min-alert` — visibility/authz gate: a crew member must
  appear in `booking_team_members` (or be the lead) to act on the alert
  for that booking. An extra with no row is locked out of their own job.
- `lib/smart-schedule.ts` `scoreTeamForBooking` — multi-tech conflict
  detection explicitly joins `booking_team_members` so an extra isn't
  double-booked elsewhere that day. A missing row means that extra reads
  as free and can be assigned a second job at the same time — a real
  double-booking risk, not just cosmetic.

Same "response says ok but a downstream-consequential write silently
failed" shape flagged repeatedly this session (booking-team replace,
routes/auto-build, recurring-schedule create paths) — this is the same
table (`booking_team_members`) at a create-time site those prior passes
didn't cover (they fixed the *update* path, `PUT /api/bookings/[id]/team`,
in `04da4cfe`).

Grepped every writer of `booking_team_members` across `src/app` + `src/lib`
(4 non-test files total) to confirm no other create-time write site has the
same gap: `bookings/[id]/team/route.ts` (PUT, already fixed with full
rollback in `04da4cfe`), `admin/bookings/[id]/closeout-summary` and
`team-portal/15min-alert` (read-only), `client/recurring/route.ts` (this
fix). Class is now fully swept.

### Fix

Did not roll back the bookings/schedule on a `booking_team_members`
failure — unlike the PUT /team route, there's no earlier-good-state to
restore to (each booking's own `team_member_id` lead was already written
correctly at insert time; only the *extras* record failed), and the
bookings themselves are real, valuable state the client is expecting to
see confirmed. Rolling back would trade a real booking for an unrelated
bookkeeping failure.

Instead, matching the existing `comms_fail` idiom (`lib/nycmaid/sms.ts` —
insert a `notifications` row so ops actually sees it) and the
`recurring_generation_conflict` pattern already used in
`cron/generate-recurring/route.ts`: kept the `console.error`, added a
`team_sync_fail` notifications row (tenant-scoped via `tenantDb()`,
which auto-stamps `tenant_id`) naming the schedule, booking count, and
extras count at risk.

New test (`route.team-sync-fail-notify.test.ts`, 2 tests) mutation-
verified RED (`git apply -R` the fix via a saved patch — confirmed the new
test fails for the right reason: `expected [] to have a length of 1`) →
GREEN (reapply, confirm pass). Full `client/recurring/` sibling suite
(4 files, 8/8) and full repo suite both clean after.

## Item 1 (scheduling/dispatch depth) — checked, no further landing

Read every other admin recurring-schedule write path looking for the same
class: `admin/recurring-schedules/route.ts` (POST), `[id]/regenerate`,
`[id]/exception`, `admin/recurring-schedules` batch-insert-rollback — all
already carry proper insert-error-checked + rollback/notify handling from
prior passes this session; none touch `booking_team_members` (admin flows
are single-lead only, no extras concept). `cron/generate-recurring/route.ts`
re-read in full: already has its own batch→per-row-fallback→notify pattern
for the `fn_block_booking_overlap` trigger case, same idiom applied here.
No new landing.

## Notice list

None carried into this pass.

## Verification (this pass)

- `npx tsc --noEmit`: same pre-existing baseline (2 unrelated errors —
  `bookings/broadcast` test mock typing, `sunnyside-clean-nyc` site-nav
  import), none in touched files.
- Full repo suite: 562 files, 2069/2072 tests passed (1 expected-fail + 1
  skipped accounted for), 1 pre-existing failure in
  `cron/tenant-health/status-coverage-divergence.test.ts` (untouched file,
  same documented intentional "RED until fixed" invariant noted in every
  prior W4 report this session).
- No push, no deploy, no DB write. 1 source file fixed, 1 new test file.
