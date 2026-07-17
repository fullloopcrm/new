# W2 gap/fluidity refresh — 2026-07-17 00:40

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-schedules-import-terminated-staff-gap-2026-07-17-0013.md`.

## Fresh ground + project-archetype depth (combined) — BookingsAdmin edit modal silently truncated multi-day/project bookings

New bug class this round, unrelated to gap #12's terminated-crew root cause. `POST /api/projects` creates a long job as a normal `bookings` row spanning many days (`duration_class:'project'`, e.g. `2026-08-01T09:00` → `2026-08-30T17:00`). The only admin UI for editing a booking (`BookingsAdmin.tsx`'s edit modal, reachable from the operator dashboard's job list and `ScheduleIssues` via `/dashboard/bookings?edit=<id>`) has no `end_date` control — it only exposes `start_date`/`start_time`/`hours` — and its `saveBooking()` unconditionally recomputed `end_time` as `start_date + start_time + hours` on every save, regardless of which fields the admin actually touched. For a same-day booking that's correct. For a multi-day/project span, opening the modal and saving ANY change (price, notes, status, team assignment — nothing date-related required) silently collapsed the real end date onto the start day, permanently destroying the span.

**Fixed**: extracted the span computation into a pure helper (`src/lib/booking-edit-span.ts`, `computeEditedSpan`) that detects a multi-day original span (start/end dates differ) and preserves it — shifting the stored `end_time` by whatever the start actually moved (0 if untouched) instead of re-deriving it from `hours`. Same-day bookings get byte-identical output to before. 4 new unit tests (no-op save preserves the 29-day span; start-date shift moves the whole span by the same delta; ordinary same-day booking still recomputes from hours; a start-time shift crossing midnight doesn't break the span). Mutation-verified via `git diff`/`apply -R` (stash disabled) — confirmed the diff reverts cleanly to the old destructive one-liner and reapplies clean. tsc clean, full suite 499/499 files, 2241/2241 passed + 37 skipped, 0 regressions from 498/498 2237+37 baseline.

Did not add `sim-all-trades.ts` archetype coverage for this one — the bug lives entirely in a client-side React component (`BookingsAdmin.tsx`'s modal), and the harness drives real HTTP routes only, not component-level UI state. The extracted pure function is unit-tested directly instead, same reasoning as last round's staged-import call.

## NOTICED — not fixed, flagging for the leader/Jeff

While tracing this bug I looked at the "Projects" feature (`ProjectsView.tsx` + `/api/projects`) end-to-end and it's considerably less built out than it looks:

- `POST /api/projects` creates the project row + its span booking with **`price:0`** and **no `team_member_id`**, and there is no dedicated UI or API to ever set either one *as a project*. The only path to touch that booking again is the general booking-edit modal I just fixed the truncation bug in — which has no concept of "this is a project," derives "hours" from time-of-day only (nonsensical for a 30-day span), and has no real pricing model for a project (the discount/hourly-rate math is built for same-day slot jobs).
- `ProjectsView.tsx` itself is read-only-plus-create: it renders spans on a Gantt-style horizon and has a "+ New Project" form, but no edit/delete/reassign/re-price affordance of its own.
- No `stage` transitions are exposed anywhere (the row is created with `stage:'scheduled'` and nothing ever PATCHes it).
- This is squarely a missing-feature gap, not a bug I can mechanically close — pricing/staffing/staging a multi-week project needs real design (does it bill per-milestone? per-visit? one lump sum on completion? does a single `team_member_id` even make sense for a job that likely uses different crews on different days?), not a same-session guess. Flagging as a new missing-feature item rather than guessing at scope.

## MISSING-FEATURE GAPS (carried forward + one addition)

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin, client-portal, and staged-import paths all closed).
13. **NEW** — The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. See NOTICED section above for detail. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).
