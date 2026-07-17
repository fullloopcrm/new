# W2 gap/fluidity refresh — 2026-07-16 21:40

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction), refreshed after this round's fix. No master file (per W4's confirmed pattern) — this is a dated snapshot.

## Fixed this round (see commits 86b797ad, 0634e5e8 on p1-w2)

1. **Terminated crew could be silently scheduled onto future job sessions.** `PATCH /api/jobs/[id]/sessions/[sessionId]` and `POST .../sessions` (the two routes that build a session's assignee set) only validated an explicit `team_member_id`/`assignee_ids` against `team_members` existence + tenant — never against `hr_employee_profiles.hr_status`. A crew member the business had already terminated could be reassigned to, or newly scheduled onto, any job session with zero warning. Real risk for the project-archetype trades this branch owns: these jobs run for weeks, so a mid-project termination is a normal operational event, not an edge case. Fixed with a new `getTerminatedTeamMemberIds()` guard (`src/lib/hr.ts`) on both routes — rejects with 400 naming the terminated member(s) before any write. Deliberately narrow to `'terminated'` — `on_leave` stays assignable, and this never touches *past* pay (a terminated employee's final paycheck is untouched).

## NEW — FRESH GROUND: no functional UI path anywhere records a payroll payment

Tracing gap #9 from last round (payroll-prep's read-side blindness to `payroll_payments`) further surfaced the mirror-image write-side problem: **there is no working UI anywhere in the product for an operator to record that they paid a contractor/crew member.**

Confirmed three ways:

1. `POST /api/finance/payroll` is the ONLY route in the entire codebase that writes to `payroll_payments`. Repo-wide grep for its literal path (`/api/finance/payroll'`) outside test files returns **zero matches** — no page, no component, nothing calls it.
2. `src/app/dashboard/team/page.tsx` renders a "Pay" button (and a "Schedule" button) on every team member's roster card — both `<button type="button">` with **no `onClick` at all**. Contrast: the Applications tab in the same file has `Approve`/`Reject`/`Delete` buttons that ARE wired (`onClick={() => updateApplication(...)}` etc.) — so this isn't a stylistic choice, the Pay/Schedule buttons are simply unfinished.
3. The same page's tab bar lists three tabs — `'ops_admin'` (D), `'performance'` (E), `'payroll'` (F) — that are clickable but have **no render branch at all** (`tab === 'applications' | 'sales_apps' | 'team'` are the only three conditions in the file). Clicking "Payroll" renders a blank content area with no explanation.

For comparison: the cleaning-vertical's own payout path (`POST /api/admin/bookings/[id]/cleaner-payout`, fixed at 21:15 this session) IS wired to a real caller (`src/components/closeout-detail.tsx`). Only the contractor/project-archetype payroll path is fully dead on both ends — no reader (gap #9) and no writer (this finding).

**Not fixed.** This is squarely the same product-decision area already flagged to Jeff (gap #9): building a Pay modal + wiring the dead tabs on top of a `payroll_payments`/`team_member_payouts` data model that's already under review would likely be throwaway work. Flagging as the same priority tier as #9 — together they mean project-archetype tenants have **no functional payroll feature at all**, not just an inaccurate report.

## MISSING-FEATURE GAPS (carried forward, unchanged unless noted)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior round).
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is dead code (no frontend caller) and undercounts if invoked. Not fixed — product decision needed.
7. `job_payments.invoice_id` exists but nothing sets/reads it — Job detail page's "$X collected" is fully disconnected from the real invoice/payment/ledger rail. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism for missed periods — still open, deliberately not building it (product decision on retroactive-vs-today posting, per prior refresh).
9. `GET /api/finance/payroll-prep` structurally blind to `payroll_payments` — every project-archetype contractor shows $0 gross/paid-out and `hits_1099_threshold=false` regardless of real history. Flagged HIGH priority (compliance-adjacent).
10. **NEW:** No working UI writer for `payroll_payments` anywhere in the product (see above) — the write-side twin of #9. Together, #9 + #10 mean the ONLY 1099/contractor payroll feature in the product is entirely non-functional for roofing/remodeling/interior_design tenants: nothing records a payment through the UI, and the one report that exists can't see the table even if something did.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll" above) — also clickable, also blank. Carried forward as one item since fixing "Payroll" alone without addressing the sibling tabs would look inconsistent.
