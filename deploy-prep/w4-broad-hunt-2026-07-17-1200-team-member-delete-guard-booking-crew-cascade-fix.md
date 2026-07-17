# W4 broad-hunt — 2026-07-17 12:00 EDT — new bug class

Queue (11:55 LEADER order, 3-deep, file-only, no push/deploy/DB):
(1) pivot to a new bug class entirely (booking_team_members writes + scheduling/dispatch races both read closed)
(2) continue fresh-ground hunting
(3) keep gap/fluidity current

This file is (1)+(2)+(3) combined — one landing.

## New class: team member hard-delete silently cascades away active crew assignments

`checkTeamMemberDeletable()` (`src/lib/team-member-delete-guard.ts`) is the
shared guard both live delete doors call before hard-deleting a
`team_members` row (`DELETE /api/team/[id]`, `DELETE /api/cleaners/[id]`).
It already blocks on payroll history, payouts, HR documents/notes, and
real HR profile data — but it never checked `booking_team_members`.

`booking_team_members.team_member_id` carries `ON DELETE CASCADE`
(migration `2026_05_19_ratings_team_bookings.sql`, confirmed against
`supabase/schema.sql` as the live definition). This table is the *only*
record of a non-lead extra crew member on a multi-tech booking — a fact
already established this session (11:55 report on `client/recurring`'s
`team_sync_fail` fix): `closeout-summary`'s payout breakdown falls back to
lead-only without it, `team-portal/15min-alert` gates on it, and
`smart-schedule.ts`'s conflict detection reads it to avoid double-booking
the *other* crew still assigned to that job.

Concretely: a team member with no payroll/payout/HR history yet — a brand
new hire, or a per-job contractor scheduled for their first job and not
yet paid — can be assigned as a non-lead extra on an upcoming booking via
`booking_team_members`. None of the guard's existing checks would catch
this. Deleting that team member (either delete route) cascades their
`booking_team_members` row away with **zero error, zero notification,
zero audit trail** — the booking's crew silently drops by one, understaffing
a real upcoming job with no trace of what happened or why.

Traced why the lead role (`bookings.team_member_id`) doesn't have the same
silent-cascade shape: that FK is plain `REFERENCES team_members(id)` with
no `ON DELETE` clause (`NO ACTION` by default per `supabase/schema.sql`),
so `team/[id]`'s DELETE (which doesn't null anything first) would hit a
raw FK-violation 500 rather than cascading — ugly, but not silent data
loss. `cleaners/[id]`'s DELETE nulls `bookings.team_member_id` and
`recurring_schedules.team_member_id` explicitly before deleting, which is
an intentional unassign-then-delete pattern, not a gap. Neither route
does anything analogous for `booking_team_members` extras, because
neither route (nor the shared guard) ever queries that table at all.

### Fix

Extended `checkTeamMemberDeletable()`: after the existing checks, query
`booking_team_members` for this member, then check whether any of those
booking IDs are still in a non-terminal status (`pending`, `scheduled`,
`in_progress`, `available` — everything in the documented enum except
`completed`/`cancelled`). If so, block with a clear 409 reason instead of
letting either route proceed into a silent cascade. Deliberately scoped
to only the `booking_team_members`/extras gap — left the lead-role
(`bookings.team_member_id`) behavior alone since `cleaners/[id]`'s
null-then-delete pattern for the lead slot is existing intended design,
not part of this bug.

3 new tests added to `team-member-delete-guard.test.ts` (crew-blocks-active,
allows-when-only-completed/cancelled, doesn't-block-on-other-member/tenant)
on top of the file's existing 9, 12/12 total. Mutation-verified: `git diff`
saved to a patch, `git apply -R` to revert the guard fix only (test file
left in place) — confirmed the new "blocks... active booking" test failed
for the right reason (`expected true to be false`, i.e. the un-fixed guard
returned `deletable: true`), then `git apply` to reapply and confirm GREEN.

## Item 1 (booking_team_members / scheduling-dispatch) — confirmed closed, no further landing

Re-swept all non-test `booking_team_members` writers and both hard-delete
routes; this cascade-on-delete gap was the only unfixed instance. No
further landing on the write-side thread (already closed per 11:55
report) or scheduling/dispatch atomic-race thread (already closed per
prior W4 rounds).

## Notice list

None carried into this pass.

## Verification (this pass)

- `npx tsc --noEmit`: same pre-existing baseline (2 unrelated errors —
  `bookings/broadcast` test mock typing, `sunnyside-clean-nyc` site-nav
  import), none in touched files.
- `team-member-delete-guard.test.ts`: 12/12 pass. `team/[id]` +
  `cleaners/[id]` route test dirs: 19/19 pass (4 files).
- Full repo suite: 562 files, 2071/2075 tests — 1 pre-existing intentional
  RED (`cron/tenant-health/status-coverage-divergence.test.ts`, documented
  every prior W4 report this session), 1 pre-existing flaky-under-parallel
  test (`cron/generate-recurring/route.duplicate-occurrence-race.test.ts`
  — untouched file, re-ran in isolation and passed 2/2, consistent with
  the same parallel-load flake class other workers reported today).
- No push, no deploy, no DB write. 1 source file fixed, 1 test file
  extended.
