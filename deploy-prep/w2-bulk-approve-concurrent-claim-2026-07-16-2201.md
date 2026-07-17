# W2 gap/fluidity refresh — 2026-07-16 22:01

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction), refreshed after this round's fix. No master file (per W4's confirmed pattern) — this is a dated snapshot.

## Fixed this round

1. **`POST /api/team-applications/bulk-approve` double-provisioned/double-emailed the whole batch on concurrent calls.** Same TOCTOU class as last round's single-approve fix (fefb19ed), N-wide here: the route SELECTed every `status='pending'` row, then ran a separate UPDATE keyed only on the fetched ids (no status re-check in the UPDATE's own WHERE), then provisioned+emailed every row from the SELECT. Two concurrent "Approve All" calls (double-click, or a client retry after a slow/dropped response) would both SELECT the same pending batch before either UPDATE landed, then both provision+email every applicant a second time — an ops person clicking "Approve All" twice on a slow connection could spam an entire pending queue with duplicate PIN emails. Fixed with a single atomic claiming UPDATE: `status='pending'` moved into the UPDATE's own WHERE, and `.select()` returns only the rows THIS call actually flipped — a second concurrent call sees 0 pending rows left to claim. 3 new tests, mutation-verified via `git diff > /tmp/x.patch && git apply -R/apply` (not stash, per this round's standing-rule correction). Commit 0e0d3c47.

## Fresh-ground pass this round (no new instance found)

Surveyed every other bulk/batch route (`bookings/batch`, `documents/[id]/fields`, `finance/bank-transactions/suggest`, `cleaners/priority`, `import-clients`, `cron/rating-prompt`) for the same read-then-write-without-a-status-reclaim shape that hit bulk-approve. `bookings/batch` is INSERT-only (already hardened against cross-tenant FK injection in prior rounds — no CAS need, nothing to double-claim). The others are either non-money, non-notification, or already status-scoped at the query level. No new instance of the class found this pass.

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

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
