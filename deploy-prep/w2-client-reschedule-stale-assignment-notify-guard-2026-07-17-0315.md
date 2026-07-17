# W2 gap/fluidity refresh — 2026-07-17 03:15

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-cron-confirmations-late-check-in-terminated-crew-guard-2026-07-17-0303.md`.

## Fresh ground (real bug) — terminated-crew bug class, via the genuinely NEW trigger flagged last round: a client-initiated write, not a cron

Last round's own NOTICED closed out the cron angle: every automated cron reading `bookings.team_member_id` to notify a team member now has the guard, and flagged that any *future* stale-assignment bug in this class would need a genuinely new trigger — a non-cron background job, a webhook, or a UI surface reading `team_member_id` directly — rather than another cron sweep. Pivoted the hunt accordingly instead of re-walking cron call sites.

Found one in `PUT /api/client/reschedule/[id]`. This route already had a terminated-crew guard (closed in an earlier round): a caller-supplied `team_member_id` in the request body — a **NEW** assignment happening in this same request — is checked against `getTerminatedTeamMemberIds` before the booking update runs. But that guard only fires when the client's request body actually includes `team_member_id`. The overwhelmingly common case is a client moving the date/time of their booking and never touching the assignment at all — and in that path, the async notification fan-out reads the booking's **EXISTING** `team_member_id` straight off the just-updated row and hands it to `notifyTeamMember()` (push + SMS + email) with zero `hr_status` check. Since HR termination never clears `bookings.team_member_id` (same root cause as every cron guard fixed the last two rounds), a booking can already be stale-assigned to a fired worker before this request ever happens — and a client innocently rescheduling their own appointment would still trigger a "Job Rescheduled" push/SMS/email to someone who no longer works there.

Same underlying data problem (gap #20) as the cron rounds, reached through a structurally different code path: a synchronous per-request write-then-notify triggered by an authenticated client, not a batch job reading a query pass. The existing terminated-crew guard on this exact route only ever validated the *incoming* value, never the *pre-existing* one it was about to notify.

**Fixed**: the existing `team_member_id` on the updated booking now also runs through `getTerminatedTeamMemberIds` immediately before the `notifyTeamMember()` call, independent of whether the request body supplied a `team_member_id` at all — so both the "reassigning to a terminated worker" path (existing guard) and the "just moving the date on an already stale-assigned booking" path (this fix) are covered.

Checked the sibling caller of a team-notify helper, `PUT /api/bookings/[id]/team` (admin multi-tech assignment) — clean: it only ever notifies `newlyAddedExtras`, a subset of `requestedIds`, and `requestedIds` already 400s on any terminated id before the update runs. No second instance of this pattern there.

1 new test file, 3 tests (SUPPRESSED: date-only reschedule of a booking already stale-assigned to a terminated worker doesn't notify them; CONTROL: same for an active worker still notifies; WRONG-TENANT PROBE: a same-id member terminated only in another tenant is not suppressed here). Mutation-verified via `git apply -R`/`git apply` (fixed route file reverted → the SUPPRESSED assertion went RED reproducing the exact bug — terminated worker's id present in the `notifyTeamMember` call — restored, all green). tsc clean. Full suite: 515/515 files (excluding one confirmed-flaky `finance-export.test.ts` 200k-row-pagination timeout under full-suite parallel load, reproduced as passing in isolation — unrelated to this change, not a regression), 2281/2319 passed + 37 skipped (exactly +3 over the prior round's 2316 baseline).

## Archetype depth — client/reschedule stale-assignment notify guard

Added `sim-all-trades.ts` section 5a-15 (after 5a-14, same archetype block). Reuses 5a-13/14's real seeded stale-assigned booking (already-terminated worker) and CONTROL booking (active helper) plus their `getTerminatedTeamMemberIds` result — the guard the reschedule fix now calls is the identical `getTerminatedTeamMemberIds([team_member_id])` shape, just triggered from a client PUT instead of a cron GET, so no new seed rows or guard call were needed, just new assertions against the existing result.

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide.

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
2. Carried forward, unchanged: retroactive-repair-of-already-drifted-`monthly_date`-prod-data question (gap #19's NOTICED) — needs a live-DB audit, not guessed at.
3. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open — this round's fix is another *symptom* mitigation on top of it (same class as every prior round in this bug family: stop the notification, don't touch the stale data). Staying with Jeff per the leader's explicit instruction not to build either unassign-vs-alert option unilaterally.
4. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic, not fixed, same root cause as #3).
5. **New this round**: this was the first *non-cron* trigger found and closed in this bug class. The hunt so far has covered: admin-triggered new-assignment writes (earlier rounds), automated cron reads (last two rounds), and now one client-portal write-then-notify path. Not yet swept: any background job or webhook that reads `team_member_id` (checked `webhooks/telnyx` and `webhooks/stripe` — neither reads `bookings.team_member_id` to notify a team member; telnyx's team-member branches only ever act on an *inbound* SMS from that member's own phone, not push notifications sourced from a stale assignment), and UI-surface direct reads (e.g. dashboard/calendar views rendering a booking's assigned lead) haven't been audited for whether they visually flag a terminated assignee vs. silently showing them as current crew — that's a display/UX-severity question, not a notification-severity one, and wasn't chased this round to stay within the "real bug" bar the rest of this class has held to.

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
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call on block-and-alert vs. auto-unassign. This round's `client/reschedule` fix is another symptom mitigation on top of it, same as the last two cron rounds — see NOTICED #3.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).
