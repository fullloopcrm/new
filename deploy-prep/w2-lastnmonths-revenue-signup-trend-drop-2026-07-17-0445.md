# W2 gap/fluidity refresh — 2026-07-17 04:45

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-cash-flow-monthly-anchor-drift-2026-07-17-0435.md`.

## Fresh ground (real bug) — monthly revenue/signup trend buckets silently dropped a real month whenever "today" was day 29/30/31

Fourth call site of the `setMonth`/`setUTCMonth` day-clamping bug class this session (after `lib/recurring.ts`'s `generateRecurringDates()`, `finance/cash-flow/route.ts`'s `advanceCursor()`, and `p1-w1`'s `cron/recurring-expenses/route.ts` `advance()` fix) — but a genuinely different symptom shape: not a chained/permanent forward drift, a **single-hop overflow** that collides two different months onto the same trend-chart label and makes a third month's label disappear from the map entirely.

Three call sites shared the identical inline pattern: `admin/analytics/page.tsx` ("Signups by month", last 6 months), `api/finance/revenue/route.ts` (tenant-scoped monthly revenue breakdown, last 12 months), and `api/admin/finance/route.ts` (admin-wide monthly trend + per-tenant breakdown, last 12 months) all built their month list with:

```ts
for (let i = N; i >= 0; i--) {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}
```

`d` starts as *today* — including today's real day-of-month — and `setMonth()` mutates it in place for every `i`. When today's day is 29, 30, or 31, subtracting certain values of `i` lands on a month too short to hold that day, and the overflow rolls forward into the next month (e.g. `May 31` minus 2 months = `Mar 31`, but `Mar 31` minus 1 more only reaches `Feb 31` → rolls to `Mar 3`, colliding back onto the same March label a second time while February's label never gets generated at all). Verified with a live repro script: for a day-31 "now" in a 31-day month, only **7 of the intended 12 month labels survive** — 5 months collapse into duplicate neighbors.

This isn't just a cosmetic chart-label bug. Both finance routes then bucket real paid-booking rows with `if (key in monthMap) monthMap[key] += booking.price`. A booking whose real `payment_date` falls in one of the dropped months produces a `key` that was never added to `monthMap` — so `key in monthMap` is `false` and that booking's revenue is **silently excluded from the monthly trend response**, even though the page's separate `total_revenue` figure (computed independently via the ledger/a raw reduce) already includes it. The two numbers on the same page quietly stop reconciling, with no error and no visual indication anything is missing. This window isn't rare: it's every month's last day for 7 months of the year (Jan/Mar/May/Jul/Aug/Oct/Dec), plus day-30 for the other 4 (Apr/Jun/Sep/Nov) — i.e. essentially every month-end, exactly when someone is most likely to be looking at a monthly trend chart.

`admin/analytics/page.tsx`'s "Signups by month" chart has the same collision on its `label`, plus its `monthStart`/`monthEnd` window is derived from the same already-overflowed `d` — so the signup *count* for the dropped month is folded into (double-counted against) its overflow-neighbor's window instead of reported on its own bucket.

**Fixed**: extracted a single, unit-tested `lastNMonths(n, now = new Date())` helper into `src/lib/dates.ts` that anchors each month at day 1 *before* subtracting `i` (day 1 never overflows, in any month) — the same technique `ProjectsView.tsx`'s calendar-tick loop already used correctly, just not shared. Rewired all 3 call sites onto it. This one was a genuine DRY case (not speculative) — the exact same broken 5-line snippet was copy-pasted verbatim into 3 files — so a shared, tested helper was the right fix rather than 3 independent inline patches.

4 new tests in `src/lib/dates.test.ts` (day-31 anchor → 12 distinct labels in the correct order; day-30 anchor → no collision; day-1-anchoring invariant). Mutation-verified via `git diff` → `git apply -R`/`git apply`: reverting `lastNMonths` from `dates.ts` flipped all 4 new tests RED for the right reason (`lastNMonths is not a function`, since the 3 call sites now depend on the export existing), restored GREEN.

`npx tsc --noEmit`: clean. Full suite: 521 files (was 520), 2345 tests total (was 2341) — 2308 passed + 37 skipped, 0 failed, 0 regressions (+4 new tests, no repeat of the finance-export full-suite-parallel flake this run).

No DB migration needed — pure application-layer date-math fix, no schema involved.

## Archetype depth — `lastNMonths()` anchor-overflow live-schema probe

Added `sim-all-trades.ts` section 5a-21 (after 5a-20). Unlike `advanceCursor()`/`advance()` in the three prior rounds' probes (private, inline route logic that can't be called directly), `lastNMonths()` is an **exported** production function — so this probe calls it directly with a simulated day-31 "now", not just proving column shape around it. Two things proven against the real live schema: (1) the pure function itself returns 12 distinct labels for a real day-31 anchor (old inline loop: 7), and (2) a REAL `bookings` row inserted with `payment_date` set inside the specific month the old bug's Jul-31 anchor dropped entirely (`2025-09-15`) — read back through the exact `price, payment_date` column selection the finance routes use — keys into a bucket that exists in the fixed `monthMap`, where under the old per-site inline loop it would not have.

Cleans up its own probe booking (delete, not just deactivate — no downstream job/payment/ledger side effects to unwind, unlike the cash-flow probe's `recurring_expenses` row).

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers) — flagging for the leader to run alongside 5a-20's checks. Verified statically: `tsc --noEmit` clean project-wide.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` still not merged into this worktree (re-confirmed via `git log --all`). Not re-touched.
2. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` — product-classification calls, need Jeff.
3. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18).
4. Carried forward, unchanged: retroactive-repair-of-already-drifted-prod-data question for `recurring_expenses.next_due_date` — needs a live-DB audit, not guessed at.
5. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) — staying with Jeff.
6. Carried forward, unchanged: client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic).
7. Carried forward, unchanged: calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.
8. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call.
9. Carried forward, unchanged: terminated-crew hunt and RBAC missing-`requirePermission` hunt both still confirmed dry.
10. Carried forward, unchanged: the 3 per-tenant clone `_lib/recurring.ts` files remain confirmed-dead code with the original chaining bug, left untouched.
11. New, not fixed (retroactive-data question, same shape as NOTICED #4): if any tenant has already been checking their monthly revenue/signup trend on a day-29/30/31 in the past, the response they saw that day genuinely under-reported that month's real revenue/signups — this fix only prevents it going forward, it doesn't retroactively correct anything (there's nothing to correct in the DB; the bug was in the read-time bucketing, not a write, so no stored data is wrong — only a past *view* of it was). Flagging in case Jeff wants to know a specific past report was wrong, not because any fix is needed.

## MISSING-FEATURE GAPS (carried forward, unchanged)

1. No per-job costing (expenses/payroll_payments still have no job_id).
2. No time tracking (hourly comp_type still unexercised anywhere).
3. No job-level materials/subcontractor cost capture (same root cause as #1).
4. No payroll batch/run concept.
5. Expense edit/delete ledger gaps — fully closed (prior rounds).
6. `GET /api/finance/payroll-prep`'s `?year=YYYY` 1099 mode is dead code and undercounts if invoked. Not fixed — product decision needed.
7. `job_payments.invoice_id` exists but nothing sets/reads it. Not fixed — feature decision needed.
8. `recurring_expenses` has no manual "run now" / catch-up mechanism — still open.
9. `GET /api/finance/payroll-prep` structurally blind to `payroll_payments` — HIGH priority, flagged to Jeff.
10. No working UI writer for `payroll_payments` anywhere — flagged to Jeff.
11. ~~No scheduling-conflict guard~~ — RETRACTED (real DB trigger already blocks it).
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED.
13. The "Projects" feature has no real staffing/pricing/stage-progression model. Not fixed — needs a product call.
14. ~~`service_type` free-text field may be silently unset/stale~~ — CLOSED.
15. ~~`recurring_type` free-text field may go stale~~ — VERIFIED NON-ISSUE.
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED.
17. ~~`bookings/broadcast`'s mass SMS/email had no HR-termination check~~ — CLOSED.
18. `POST /api/reviews/request` has no SMS-consent check — open, product call needed.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted~~ — CLOSED (`lib/recurring.ts`, `finance/cash-flow/route.ts`; `cron/recurring-expenses` fixed on `p1-w1`, not merged here).
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call.
21. GDPR erasure requests do not reach `document_signers` — needs Jeff's call.
22. Same missing-`sms_consent`-check pattern across 5 client-facing SMS send sites — 2 of 5 CLOSED; remaining 3 need Jeff's call.
23. **NEW, CLOSED this round**: `admin/analytics`, `finance/revenue`, and `admin/finance`'s monthly trend/breakdown buckets silently dropped real revenue/signup data on any day-29/30/31 "now" — see Fresh ground above.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail.
3. "Ops Admin" and "Performance" tabs on the Team page — confirmed genuinely unbuilt.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners with no indication.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+`test` combined, 1× `test(sim)`, this `docs`).
