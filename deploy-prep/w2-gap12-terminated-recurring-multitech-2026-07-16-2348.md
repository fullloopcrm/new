# W2 gap/fluidity refresh — 2026-07-16 23:48

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — dated snapshot, continues directly from `w2-verifytoken-member-status-gate-plus-archetype-stale-token-probe-2026-07-16-2328.md`.

## Fresh ground — gap #12 closed (was flagged, deliberately deferred, across the last several rounds)

Gap #12 read: "Recurring-schedule assignment (`admin/recurring-schedules*` + the `generate-recurring` cron) has no terminated-crew check — carried forward, deliberately deferred. `PUT /api/client/preferred-cleaner` also still has no terminated check (lower severity)." Closed this round, and it turned out bigger than the gap text implied.

**Root cause**: HR termination only ever writes `hr_employee_profiles.hr_status` — it never touches `team_members.status`/`active` (deliberate design, see `hr.ts`'s own doc comment). Every write path that assigns a `team_member_id` and *isn't* one of the already-guarded single-booking routes had nothing checking termination at all:

1. `admin/recurring-schedules` POST/PUT and the per-occurrence `exception` POST (`type='reassign'`) — checked tenant ownership, never HR status. A fired employee could be handed a brand-new standing weekly assignment.
2. **`cron/generate-recurring`** (highest severity of the four) — writes directly into `bookings` via `supabaseAdmin`, bypassing `POST /api/bookings`' own terminated-crew guard entirely, since that guard only runs on that specific route, not on a raw table insert. A schedule still pointed at a fired member's id would keep auto-generating them onto brand-new FUTURE bookings, every week, forever, completely invisible unless someone thought to check.
3. **`scoreTeamForBooking`** (`smart-schedule.ts`) — the shared scoring pool behind FOUR callers: `admin/smart-schedule` (the admin assignment-suggestion UI), `client/smart-schedule` + `client/book` (the public booking form's auto-suggest), and `generate-recurring`'s own smart-assign path (per-tenant flag, default off). It filtered `team_members.status != 'inactive'` — a check HR termination never trips. A fired employee could be scored, suggested with a score, and (via `pickBestTeam`) auto-picked for a new booking by any of the four.
4. `client/preferred-cleaner` PUT — checked `team_members.active`, not HR status. A client could set a fired employee as their "preferred tech," which then gets `scoreTeamForBooking`'s strongest possible bonus (+200, "Client's preferred tech") on every future auto-suggest.

**Fixed**: root-cause fix in `scoreTeamForBooking` (excludes `getTerminatedTeamMemberIds` up front, mirroring the existing day-off/outside-hours/conflict/zone hard-blocks — surfaces as `available:false, conflict:'No longer employed'`, not silently dropped) closes #3 and, for free, the smart-assign half of #2 (since `generate-recurring`'s `preferredStillFits`/`pickBestTeam` both read off `scores[].available`). Added a matching explicit guard to `generate-recurring`'s binary-lock path (doesn't call the scorer), and explicit write-side guards on the three admin recurring-schedule routes (#1) and preferred-cleaner (#4). 16 new tests across 6 files (including 3 wrong-tenant probes proving every lookup is scoped by `(tenant_id, id)`), mutation-verified via `git diff`/`apply` (not stash) on the two most complex fixes — RED on revert, GREEN restored. tsc clean. Full suite 494/494 files, 2224/2224 passed + 37 skipped, 0 regressions from 488/488 2208+37 baseline. Commit `8131f28a`.

## Archetype depth

First-ever archetype coverage of the multi-tech (`booking_team_members`, `PUT /api/bookings/[id]/team`) surface — every prior scenario only ever exercised the single `bookings.team_member_id` lead, despite every one of these trades routinely running a crew of 2+. New scenario hires a second real crew member and proves the same terminated-crew guard (86b797ad) also catches a fired worker showing up in the *extras* array, not just the lead field — attempted with the already-terminated worker from 5a-2 as a third extra, blocked, corrected submission (lead + helper only) writes cleanly. Also closed a real cleanup-list miss found while building this: `booking_team_members` wasn't in the archetype's own post-run teardown, which would have leaked 2 rows per sim run once this path started getting exercised (same class as the earlier `expenses` cleanup gap). Script not executed against DB (leader-run-only) — verified by direct source-read against the real route's write sequence. Commit `c8c6880d`.

## MISSING-FEATURE GAPS (carried forward; #12 now closed)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior rounds).
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is dead code (no frontend caller) and undercounts if invoked. Not fixed — product decision needed.
7. `job_payments.invoice_id` exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism for missed periods — still open, deliberately not building it.
9. `GET /api/finance/payroll-prep` structurally blind to `payroll_payments` — HIGH priority (compliance-adjacent). Flagged to Jeff alongside #10.
10. No working UI writer for `payroll_payments` anywhere in the product — flagged to Jeff at the same priority as #9.
11. ~~No scheduling-conflict guard~~ — RETRACTED (real DB trigger already blocks it).
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — **CLOSED this round** (see above; turned out to also cover the smart-schedule scoring pool behind 4 call sites, not just the recurring-schedule routes named in the original gap text).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
