# W2 gap/fluidity refresh — 2026-07-17 02:29

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-apology-batch-sms-consent-guard-2026-07-17-0213.md`.

## Fresh ground (real bug) — broadened past terminated-crew/consent to a THIRD bug class: recurring monthly_date generation permanently drifted off its anchor day

Per the leader's earlier note to broaden the search once terminated-crew was nearing exhaustion (and this round's own follow-up after the consent-field sweep found only one hit out of six candidates), widened the search again — this time away from write-guard-missing bugs entirely, into pure date-math. `generateRecurringDates()` in `@/lib/recurring.ts` is the production function `POST /api/schedules` (initial recurring-schedule creation) and `cron/generate-recurring` (the weekly refill engine) both call directly to expand a `recurring_schedules` row into real bookings.

**The bug**: the `monthly_date` branch chained `current.setMonth(current.getMonth() + 1)` off the *previous* iteration's result instead of recomputing fresh off the true anchor each time. A day-29/30/31 anchor that overflowed a short month (Jan 31 → `setMonth(+1)` rolls to Mar 3, since Feb has no 31st — February's occurrence is silently skipped outright) became the new **permanent** baseline for every month after it (Mar 3 → Apr 3 → May 3 → … forever), silently and forever shifting a client's recurring visit day off the date they actually signed up for. The same function's `monthly_weekday` branch had a second, distinct bug: `setMonth()` ran *before* zeroing the day-of-month, so a day-29/30/31 anchor could overflow **past** the intended month before the nth-weekday search even started (e.g. a day-30 anchor's `setMonth()` call attempting "Feb 30" on a 28-day February rolls straight to March 2, so the search for that month's occurrence starts a month late and can land two months out).

The exact same `monthly_date` chaining bug was independently reimplemented in the parallel client-side generator (`dashboard/bookings/_recurring.ts`) — the one `BookingsAdmin.tsx`'s recurring-options preview/create/edit modal both computes AND submits to create real schedule rows. Same root cause, same fix shape, different loop structure (accumulate-then-advance vs. per-iteration-fresh).

**Fixed both files**: `monthly_date` now zeroes the day-of-month to 1 before advancing the month (avoiding the overflow entirely), then clamps the resulting day to the target month's real length — reproducing "same date every month" semantics (Jan 31 → Feb 28 → Mar 31 → Apr 30 → May 31) instead of a silent skip-then-permanent-drift. `monthly_weekday` reorders `setDate(1)` before `setMonth()` so the nth-weekday search always starts inside the correct month.

7 new tests across 2 files (one brand-new test file for the previously-untested `_recurring.ts`). Mutation-verified via `git apply -R`/`git apply` (both fixed files reverted together → exactly the 4 new/changed assertions across both test files went RED reproducing the drift/skip, all 18 other tests — including the pre-existing `monthly_date`/`monthly_weekday` happy-path cases — stayed green → restored, all 22 green). tsc clean. Full suite: 510/510 files, 2273/2310 passed + 37 skipped, 0 regressions (exactly +5 over the prior round's 2268 baseline).

**Confirmed non-issue while surveying this bug class**: the 3 per-tenant clone `_lib/recurring.ts` files (`nyc-mobile-salon`, `wash-and-fold-hoboken`, `wash-and-fold-nyc`) carry their own third, still-unfixed copy of the same `monthly_date` chaining bug — but re-grepped every site tree and confirmed (as a prior session's W1 finding already established, independently re-verified here) their `RecurringOptions.tsx` has zero importers anywhere in those trees. Fully unreachable dead code, not touched, consistent with the standing judgment call to leave confirmed-dead code alone rather than fix code nothing can execute.

## Archetype depth — recurring monthly_date permanent-drift fix

Added `sim-all-trades.ts` section 5a-12 (after 5a-11, same archetype block, inside the existing `if (worker?.id && remainingSession)` scope so `tenant`/`runId`/`supabase`/`worker`/`helper`/`job` are all already in scope). Seeds a real `monthly_date` `recurring_schedules` row in the P12 archetype tenant (this archetype's roofing/remodeling/interior-design clients are exactly the shape that bills a monthly maintenance-contract visit on a fixed day), then drives the exact production `generateRecurringDates()` function — not a reimplementation — with a day-31 anchor across 5 months, asserting Feb clamps to the 28th (not a silent skip to Mar 3) and Mar/May both return to the true anchor day 31 (not a drifted day).

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — flagging for the leader to run and confirm the new checks pass alongside 5a-11's. Verified statically: `tsc --noEmit` clean project-wide (scripts/ is covered by the root tsconfig's `**/*.ts` include).

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call on transactional-vs-marketing, still open.
2. This round's fix only reaches the two LIVE callers (`@/lib/recurring.ts` used by `/api/schedules` + `cron/generate-recurring`, and `dashboard/bookings/_recurring.ts` used by `BookingsAdmin.tsx`). The 3 per-tenant clone copies of the identical bug are confirmed dead/unreachable (see above) — left unfixed as dead code, not a live gap, but noting in case a future session ever wires one of those `RecurringOptions.tsx` components back up without also porting this fix.
3. Not fixed (needs prod DB access, flagging not guessing, same category as a sibling W1 finding on the recurring-expenses cron): if `monthly_date` recurring schedules have already run in prod with a day-29/30/31 anchor, some clients' actual next-generated bookings may already sit on a drifted day (e.g. billed on the 3rd instead of the 31st). This fix stops future drift but does not retroactively repair already-generated future bookings — would need a live-DB audit of `recurring_schedules` (`recurring_type = 'monthly_date'`) joined against their generated `bookings.start_time` day-of-month vs. the schedule's true original anchor, which isn't itself stored as a column (see gap-doc note below). Flagging for the leader/Jeff to decide if that audit is worth running.
4. Confirmed while investigating #3: `recurring_schedules` has no stored anchor-date column (only `day_of_week`/`preferred_time`, no `start_date`) — the `monthly_date` anchor day currently only lives implicitly in whatever `startDate` was passed to the original `POST /api/schedules` call and in the already-generated bookings' `start_time` values. Not a bug (nothing currently needs to re-derive the anchor after creation), just noting the same "field that should exist doesn't" shape as this archetype's other missing-column gaps below.

## MISSING-FEATURE GAPS (carried forward, unchanged except #19 new)

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (admin create/edit/exception, client-portal, staged-import, dispatch-route, batch-update, regenerate all closed).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call on the actual project-billing/staffing model before any code should be written.
14. ~~`service_type` free-text field may be silently unset/stale on admin-created and admin-edited bookings~~ — CLOSED (prior round).
15. ~~`recurring_type` free-text field may go stale on legacy schedule_id-less recurring bookings~~ — VERIFIED NON-ISSUE (prior round): zero live scheduled bookings match the at-risk shape.
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED (prior round).
17. ~~`bookings/broadcast`'s "URGENT JOB AVAILABLE" mass SMS/email had no HR-termination check~~ — CLOSED (prior round).
18. `POST /api/reviews/request` has no SMS-consent check (see prior round's NOTICED #1) — open, product call needed on transactional-vs-marketing classification.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted a day-29/30/31 anchor off a short-month crossing (both the server lib and the parallel client-side reimplementation); `monthly_weekday` could skip a month entirely on the same class of anchor~~ — CLOSED this round (see Fresh ground above). Retroactive-repair-of-already-drifted-prod-data question still open — see NOTICED #3.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).
