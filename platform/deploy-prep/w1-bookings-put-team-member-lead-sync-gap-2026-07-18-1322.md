# PUT /api/bookings/[id] wrote bookings.team_member_id without syncing booking_team_members (2026-07-18 13:22)

## Bug
`PUT /api/bookings/[id]` is the main single-booking edit endpoint, and it's
also the endpoint the dashboard's Check-In (Admin) / Confirm Check Out
actions call directly to (re)assign the crew member in the same request.
It wrote `bookings.team_member_id` on update without ever syncing
`booking_team_members`, unlike every other `team_member_id` write site:
`POST /api/bookings`, `PUT /api/bookings/[id]/team`, the schedule-issues
fix path, `team-portal/jobs/reassign`, and recurring-schedules
regenerate/exception.

`GET /api/bookings/:id/team` and `closeout-summary` both source the lead
from `booking_team_members` (not `bookings.team_member_id`), falling back
to the column only when the table has zero rows for the booking. Left
unsynced:
- A job dispatched/reassigned here showed as unassigned in the admin Team
  panel.
- Worse, a multi-tech job that already holds `booking_team_members` rows
  for its extras would silently drop the lead from closeout-summary's
  payout attribution entirely -- the zero-rows fallback never fires
  because the table already has rows, they just lack an `is_lead=true` one
  matching the new assignment.

## Fix (file-only, no push/deploy/DB)
`src/app/api/bookings/[id]/route.ts` -- when `team_member_id` is present in
the PATCH body, delete any existing `is_lead=true` row for the booking,
then upsert a new lead row for the new assignee (skip the upsert if the
new value is null/cleared). Upsert failure is retried once (delete+re-upsert)
and logged, not thrown -- consistent with this route's existing
best-effort notification error handling, since failing the whole request
over a secondary attribution table would block a legitimate reassignment.

## Test coverage
New `route.team-sync.test.ts` -- asserts: (1) setting `team_member_id`
creates/replaces the `is_lead=true` row in `booking_team_members`, (2)
clearing it (null) removes the lead row without inserting a new one, (3)
an existing multi-tech booking's non-lead rows are left untouched.

## Verification
- `npx tsc --noEmit`: clean vs session baseline (same 4 pre-existing
  unrelated errors elsewhere, untouched).
- `npx vitest run` on portal/auth + bookings team-sync: 6 files, 19 tests,
  all green.
