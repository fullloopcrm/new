# W2 gap/fluidity refresh — 2026-07-16 22:31

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — this is a dated snapshot. Continues directly from `w2-terminated-crew-guard-crewid-and-primary-bookings-2026-07-16-2213.md`.

## Fixed this round

1. **`POST /api/schedules` (fresh-ground) never checked `hr_status` before assigning `team_member_id`.** Same gap class as the already-fixed bookings/team/job-session routes (86b797ad, 53e83ee4, ca14a7fe), on a route those rounds hadn't reached. Distinct from the already-known `/api/admin/recurring-schedules` gap (carried forward last round, deliberately deferred as admin-configured/lower-frequency) — this is the live dashboard "Schedules" page (`src/app/dashboard/schedules/page.tsx`) and it immediately generates 4 real weeks of `bookings` on create, so it was actually the higher-severity instance of the two: a terminated worker picked here got silently booked onto real future jobs today, not a stale config row waiting on a cron. Fixed with the same guard pattern. 3 new tests, mutation-verified (`git apply -R`/`apply`). Commit `ff827f1d`.

2. **HR termination never revoked team-portal access — the bigger find this round.** Traced by asking the inverse question of everything fixed so far: those fixes stop someone else from *assigning* a terminated worker; nothing had ever checked whether a terminated worker still had a live session of their own. Answer: they did, fully.
   - `PATCH /api/dashboard/hr/[id]` (the real termination action — confirmed by reading the route AND the HR page's frontend call site) only ever writes `hr_status='terminated'` to `hr_employee_profiles`. It never touches `team_members.status`.
   - `requirePortalPermission` (the gate on every one of the ~20 `/api/team-portal/*` field-staff routes — claim, checkin, checkout, reassign, messages, earnings, etc.) only checked `team_members.status !== 'active'` for its documented "instant revocation" behavior. It never checked `hr_status`.
   - `POST /api/team-portal/auth` (PIN login, mints a fresh token) also only checked `team_members.status`, never `hr_status`.
   - Net effect: firing someone via the HR page did not cut off their portal access at all. Their existing bearer token (up to 24h life per `createToken`) kept working for every gated action — claiming new jobs, checking in/out (which releases stage-gated payments), self-reassigning crew, messaging — and worse, they could keep logging back in by PIN indefinitely, since login never re-checked `hr_status` either. Not a 24h tail risk; a permanent one until this fix.
   - Fixed by running the existing `getTerminatedTeamMemberIds(tenantId, [memberId])` helper (same one used in all the assignment-guard fixes) in both `requirePortalPermission` (every gated call) and the login route. 4 new tests (incl. a wrong-tenant probe proving a same-id termination row under another tenant doesn't leak across), mutation-verified. Full suite green (485 files / 2193 tests), tsc clean. Commit `2b96769b`.

## Fresh-ground pass this round — surveyed, NOT fixed (new)

- The P12 project-archetype harness (`sim-all-trades.ts`) never exercises the team-portal auth/claim/checkin/checkout surface at all — the archetype's crew lifecycle is driven entirely through direct DB/HR-route calls, never through `requirePortalPermission`. Today's portal-access fix (item 2) has zero direct coverage from the archetype harness as a result; it's covered only by the dedicated unit tests in `team-portal-auth.test.ts` / `route.terminated-crew-guard.test.ts`. Worth closing in a future round if the archetype's HR/onboarding section is extended toward the actual field-staff flow rather than just the admin/office side.

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
11. No scheduling-conflict guard anywhere in job session create/reassign — a crew member can be double-booked onto two overlapping sessions across different jobs with zero warning. Open design question, not built.
12. Recurring-schedule assignment (`admin/recurring-schedules*` + the `generate-recurring` cron) has no terminated-crew check — carried forward, deliberately deferred (admin-configured, lower frequency than the now-fixed live `/api/schedules` create path). `PUT /api/client/preferred-cleaner` also still has no terminated check (lower severity — a stale preference, not a direct assignment).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
