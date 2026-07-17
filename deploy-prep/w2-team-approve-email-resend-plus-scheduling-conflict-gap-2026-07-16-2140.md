# W2 gap/fluidity refresh — 2026-07-16 21:40

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction), refreshed after this round's fix. No master file (per W4's confirmed pattern) — this is a dated snapshot.

## Fixed this round

1. **Double-clicking "Approve" on a team application re-sent the applicant's welcome/PIN email every time.** `PUT /api/team-applications` re-ran `provisionApprovedApplicant` (which emails the applicant their PIN) whenever the request body said `status:'approved'`, with no check on the application's CURRENT status first. `team-provisioning`'s own dedup-by-phone stopped a duplicate `team_members` row from being created, but did nothing to stop the SAME application being re-approved (a double-click, or a client retry after a slow/dropped response) from re-sending the "Welcome! Your PIN: XXXX" email every time, with no cap. Fixed with the same CAS pattern already used on referral-commissions' mark-paid (`.neq('status', 'approved')` makes the claiming update a no-op if already approved; provisioning/email only runs on the row actually claimed). 4 new tests, mutation-verified via `git stash` (2/4 fail for the right reason with the fix reverted, restored clean). Commit pending (see channel report).

## NEW — FRESH GROUND: no scheduling-conflict guard anywhere in session create/reassign

Found while proving the crew-termination guard (86b797ad) from last round: after reassigning the replacement crew member to the remaining session, traced whether the same route pair (`POST` / `PATCH .../jobs/[id]/sessions[/[sessionId]]`) guards the OPPOSITE failure mode — a crew member double-booked onto two overlapping sessions. It does not. Both routes only ever validate `team_members` existence+tenant, and (since last round's fix) `hr_status` — neither checks the assignee's other bookings for a time overlap.

For a solo/small crew (the norm on these project-archetype trades), a double-booked crew member means one of the two jobs silently has nobody show up, discovered only when the customer calls.

**Not fixed.** Whether ANY overlap should even be blocked is a real product decision — a crew lead legitimately splitting a morning between two nearby walk-throughs is not itself a bug, so this needs a definition of "conflict" before anything can be built (same job only? any job? a buffer window?). Documented as a new expected-to-fail check in the archetype sim (same pattern as the `job_payments.invoice_id` / payroll-prep gaps) right after the crew-termination section, so it can't silently regress into "considered and rejected" before Jeff weighs in.

## MISSING-FEATURE GAPS (carried forward, unchanged unless noted)

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
11. **NEW:** No scheduling-conflict guard anywhere in job session create/reassign — a crew member can be double-booked onto two overlapping sessions across different jobs with zero warning. Open design question (see above), not built.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — also clickable, also blank. Confirmed this round these are genuinely unbuilt (no data model, no render branch at all) — not a quick wire-up, carried forward as-is.
