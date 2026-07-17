# W2 gap/fluidity refresh — 2026-07-17 03:03

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-cron-reminders-daily-summary-terminated-crew-guard-2026-07-17-0252.md`.

## Fresh ground (real bug) — same trigger as last round, two more call sites

Last round closed `cron/reminders` + `cron/daily-summary`. Widening the same "automated cron reads a stale pre-termination `bookings.team_member_id` with zero `hr_status` check" hunt across every remaining cron that texts a team member turned up two more:

- **`cron/confirmations`** (runs hourly): the team-member confirmation loop resends "please confirm your job" hourly to whoever a booking's `team_member_id` points at, for any unconfirmed booking in the next 48h, with zero `hr_status` check. Worse than a simple stale text: after 3 unanswered attempts it also fires an admin escalation ("X has not confirmed their job after 3 attempts") about someone who no longer works there — actively misleading the admin into thinking there's a live no-show risk from an ex-employee's assignment, when the real issue is nobody reassigned the job.
- **`cron/late-check-in`** (runs on its own schedule): both the late-check-in ("hasn't checked in") and late-check-out ("hasn't checked out") team-facing texts went to whoever `team_member_id` pointed at, regardless of `hr_status`. The admin-facing SMS/push in the same cron were left untouched — those are legitimately useful either way (a stale-assigned job silently going unmanned is exactly the kind of thing an admin should be told about), so only the team-member text got the guard.

**Fixed**: both crons now batch `getTerminatedTeamMemberIds` once per query pass (same helper, same pattern as every prior guard this session) and skip a terminated assignee's team-facing text. `cron/confirmations`: one batch call before the unconfirmed-jobs loop. `cron/late-check-in`: one batch call for the late-check-in pass, one for the late-check-out pass (mirroring `cron/reminders`' day/hour-pass structure).

3 new tests across 2 new dedicated files (1 for `cron/confirmations`, 2 for `cron/late-check-in` — check-in and check-out passes separately, including a CONTROL assertion that the admin still gets alerted either way in the late-check-in tests). Mutation-verified via `git apply -R`/`git apply` (both fixed route files reverted together → all 3 new assertions went RED reproducing the exact bug — terminated recipient's phone present in the `sendSMS` call list — restored, all green). tsc clean. Full suite: 514/514 files, 2279/2316 passed + 37 skipped, 0 regressions (exactly +3 over the prior round's 2313 baseline).

Surveyed every other cron touching `team_member` (`confirmation-reminder`, `phone-fixup`, `schedule-monitor`, `backup`, `generate-recurring`) — `generate-recurring` already had its own terminated-crew-guard test from an earlier round; `confirmation-reminder` texts the CLIENT (`sendClientSMS`), not the team member, so it's out of scope for this bug class entirely, not a gap; `schedule-monitor` and `backup` don't text a team member directly (schedule-monitor writes internal `schedule_issues` rows for the admin dashboard, doesn't SMS/email the assigned worker); `phone-fixup` is a one-time data-repair utility, not a notification path. No further cron call sites open in this class as of this round.

## Archetype depth — cron/confirmations + cron/late-check-in terminated-crew stale-assignment guard

Added `sim-all-trades.ts` section 5a-14 (after 5a-13, same archetype block). Rather than seed new rows, it reuses 5a-13's real seeded stale-assigned booking (already-terminated worker) and CONTROL booking (active helper) plus 5a-13's `getTerminatedTeamMemberIds` result — the guard both newly-fixed crons compute is the literal same call (same tenant, same candidate ids) as the one 5a-13 already proved, so no new seed rows or guard call were needed, just new assertions against the existing result.

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
2. Carried forward, unchanged: retroactive-repair-of-already-drifted-`monthly_date`-prod-data question (gap #19's NOTICED) — needs a live-DB audit, not guessed at.
3. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open — this round's fix is the same class of *symptom* mitigation as last round's (stop the automated text), not the cause. Staying with Jeff per the leader's explicit instruction not to build either unassign-vs-alert option unilaterally.
4. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic, not fixed, same root cause as #3).
5. **New this round**: with `cron/confirmations` and `cron/late-check-in` now closed alongside `cron/reminders`/`cron/daily-summary`/`generate-recurring`, every cron that reads `bookings.team_member_id` to notify a team member now has the guard. The terminated-crew sweep across *automated cron* call sites specifically looks exhausted (as opposed to admin-triggered write paths, which were closed in earlier rounds). Any *future* stale-assignment bug in this class would need a genuinely new trigger (e.g., a non-cron background job, a webhook, or a UI surface reading `team_member_id` directly) rather than another cron sweep.

## MISSING-FEATURE GAPS (carried forward, unchanged)

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
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted a day-29/30/31 anchor off a short-month crossing~~ — CLOSED (prior round). Retroactive-repair-of-already-drifted-prod-data question still open — see NOTICED #2.
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call on block-and-alert vs. auto-unassign. This round's `cron/confirmations` + `cron/late-check-in` fix is another symptom mitigation on top of it, same as last round's — see NOTICED #3.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).
