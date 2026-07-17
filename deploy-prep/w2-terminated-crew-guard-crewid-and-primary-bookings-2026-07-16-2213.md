# W2 gap/fluidity refresh — 2026-07-16 22:13

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction), refreshed after this round's fixes. No master file (per W4's confirmed pattern) — this is a dated snapshot.

## Fixed this round

1. **Terminated-crew guard (86b797ad) could be bypassed via `crew_id`.** Last round's fix on `POST/PATCH .../jobs/[id]/sessions[/[sessionId]]` checked `hr_status='terminated'` only against the explicit `assignee_ids`/`team_member_id` list. A `crew_id`-sourced assignee set (`crews.crew_members`, joined in and merged into the assignee `Set` with zero check) bypassed it entirely — `crew_members` isn't pruned when a member is terminated, so scheduling/reassigning a session to a saved crew that still lists a let-go worker silently booked them, no warning. Fixed by moving the terminated check to run against the FULL assembled assignee set (crew + explicit) in both routes. 4 new tests, mutation-verified via `git apply -R/apply`.

2. **The terminated-crew guard never existed at all on the primary (non-project) booking flow.** Tracing the crew_id gap above led to checking every other place a booking gets a `team_member_id` — `getTerminatedTeamMemberIds` was wired into exactly the two job-session routes and nowhere else in the codebase. Three high-traffic surfaces had ZERO check against `hr_status`, only tenant-ownership:
   - `POST /api/bookings` — the booking-create path every non-project (cleaning-vertical) tenant uses.
   - `PUT /api/bookings/[id]` — the booking-update/reassign path.
   - `PUT /api/bookings/[id]/team` — multi-tech lead/extras assignment.

   Fixed with the same guard pattern as the job-session routes.

3. **`POST /api/team-portal/jobs/reassign` (crew self-service reassignment) scoped its target off the wrong status field entirely.** `scopedMemberIds()` filters `team_members.status` for managers, or reads raw (unfiltered) `crew_members` rows for leads — neither reflects `hr_status`. `PATCH /api/dashboard/hr/[id]` (the actual termination action) only ever writes `hr_employee_profiles`, never `team_members.status`, so a terminated crew member stayed "in scope" and reassignable from a teammate's phone with zero warning. Same guard applied.

   Total this round: 5 route files fixed, 9 new tests, all mutation-verified (`git apply -R` to the pre-fix code → every BLOCKED case fails with 200 instead of 400 for exactly the right reason → `git apply` restores clean). tsc clean throughout. Commits: `ca14a7fe` (crew_id bypass), `53e83ee4` (primary bookings + team-portal reassign).

## Fresh-ground pass this round — surveyed, NOT fixed (carried forward)

Same class of gap (assignment surface with no `hr_status` check) also exists, lower priority (admin-configured / lower-frequency than the live booking flows just fixed), not built this round:
- `POST/PATCH /api/admin/recurring-schedules[/[id]]` + `.../exception` + `.../regenerate` — admin sets `team_member_id` on a recurring schedule; no terminated check anywhere in that family.
- `POST /api/cron/generate-recurring` — generates bookings FROM a recurring schedule's stored `team_member_id`. If that member is terminated after the schedule was set up, the cron will keep silently generating bookings for them indefinitely (no re-check at generation time).
- `PUT /api/client/preferred-cleaner` — client-facing "preferred cleaner" pick; no terminated check (lower severity — it's a preference, not a direct assignment, but a stale preference could still surface a terminated cleaner's name to the client).

## MISSING-FEATURE GAPS (carried forward, unchanged)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior rounds).
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is dead code (no frontend caller) and undercounts if invoked. Not fixed — product decision needed.
7. `job_payments.invoice_id` exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism for missed periods — still open, deliberately not building it (product decision on retroactive-vs-today posting).
9. `GET /api/finance/payroll-prep` structurally blind to `payroll_payments` — every project-archetype contractor shows $0 gross/paid-out and `hits_1099_threshold=false` regardless of real history. HIGH priority (compliance-adjacent). Flagged to Jeff alongside #10.
10. No working UI writer for `payroll_payments` anywhere in the product — the write-side twin of #9. Flagged to Jeff at the same priority as #9.
11. No scheduling-conflict guard anywhere in job session create/reassign — a crew member can be double-booked onto two overlapping sessions across different jobs with zero warning. Open design question, not built. (Note: distinct from the terminated-crew guard fixed this round — the regular `/api/bookings` flow DOES have a real scheduling-conflict + daily-cap guard, atomically enforced via `create_admin_booking_atomic`; it's specifically the project-lane job-session routes that have none.)
12. **NEW:** Recurring-schedule assignment (`admin/recurring-schedules*` + the `generate-recurring` cron) has no terminated-crew check — see fresh-ground section above.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
