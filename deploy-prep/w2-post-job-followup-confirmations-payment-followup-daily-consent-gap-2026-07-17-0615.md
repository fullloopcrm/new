# W2 gap/fluidity refresh — 2026-07-17 06:15

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-reminders-followup-notifications-sendbookingemails-consent-gap-2026-07-17-0600.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bugs) — 3 more call sites of the missing-consent-check bug class, the 14th through 16th this session

Last round's doc called 10-13 "apparently the LAST ones" — but that claim was scoped to routes reachable through the shared `notify()` helper. It didn't reopen the *direct*-`sendSMS()` census either, and 3 cron files that had only ever been audited for a *different* bug class (terminated-crew, or never audited at all) turned out to have this session's original gap: zero `sms_consent`/`do_not_service` check.

1. **`GET /api/cron/post-job-followup`** — runs every 30 min, sends a review-request SMS 2 hours after checkout. Two separate send sites in one file: the standalone-booking loop and a second loop for completed `jobs` (multi-session projects get one review ask at job completion instead of per-session). Both fired on `client?.phone` presence alone.
2. **`GET /api/cron/confirmations`** — runs hourly. Already had a terminated-crew guard on its *team-member* confirm-request resend (prior round), but the separate "1pm day-before" *client* confirmation block right below it was never looked at for consent — fired on `client?.phone` presence alone, once per booking per day.
3. **`GET /api/cron/payment-followup-daily`** — a second, independent payment-chase cron, parallel to `cron/payment-reminder`'s already-fixed +15/+60min nudge (this session, commit `35458e64`) but running on its own 8am/12pm/6pm daily cadence and never itself gated. Real-money chase text, up to 3x/day per unpaid booking, on `client?.phone` presence alone.

A `do_not_service` (banned) or `sms_consent=false` (STOP-revoked) client still got a real "how did everything go" review-request text 2 hours after every completed job (twice — once per booking, once per multi-session job), a real "confirming your appointment tomorrow" text every day one was scheduled, and a real payment-chase text up to 3x/day until the booking was marked paid.

**Fixed**: every client SMS send across all 3 files now also gates on `sms_consent !== false && !do_not_service`, same convention as every other client fan-out this session. `confirmations/route.ts` already used the shared `BookingTomorrowConfirm` type from `lib/types.ts` for its day-before query — extended that with a new `ClientNamePhoneConsent` type rather than inlining an ad-hoc cast. The other two files (`post-job-followup`, `payment-followup-daily`) don't use the shared-types pattern anywhere else in the file, so kept their existing inline `as unknown as {...}` cast style for consistency with their own surrounding code.

16 new tests across 3 files, mutation-verified via `git apply -R`/`git apply` on the combined fix diff — every BLOCKED assertion failed for the right reason when the fix was reverted (unconsented client got texted), CONTROL/null-consent assertions stayed correct throughout revert and reapply.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, only the same pre-existing `_opts`-unused-var warning pattern already established across every other consent-guard test file in this session. Full suite: 537 files (was 534), 2414 tests total (was 2398) — 2377 passed + 37 skipped, 0 failed, 0 regressions (+16 new tests).

No DB migration needed — `sms_consent`/`do_not_service` both already exist on `clients`.

## Archetype depth

Added `sim-all-trades.ts` section 5a-28, same pattern as every prior 5a-1x/2x round, proving all 3 fixed predicates against real `bookings`/`clients` rows in the live schema through each route's exact column selection. `post-job-followup`'s job-level review-request branch shares the byte-identical predicate/`clients()` shape as its booking-level branch proved here, so it wasn't separately probed via a live `jobs` row (would exercise the same fixed logic already covered). **Not yet executed** — `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers); flagging for the leader to run alongside the prior rounds' still-outstanding checks (5a-20 through 5a-28). Verified statically: `tsc --noEmit` clean, `eslint` clean (0 errors, same 3 pre-existing warnings, none from the new section).

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `cron/follow-up/route.ts` and `cron/reminders/route.ts`'s embedded thank-you pass appear to be two independent implementations of the same "3-day post-service thank-you email" feature — leader confirmed this is logged and not mine to resolve unilaterally.
2. Carried forward, unchanged: the `notify()` consent-gate structural-fix proposal (`w2-notify-consent-gate-structural-proposal-2026-07-17-0557.md`) awaits Jeff's sign-off on the `payment_received` carve-out question — leader confirmed this too is noted and not mine to push further this round.
3. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` still not merged into this worktree.
4. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` — product-classification calls, need Jeff.
5. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) — staying with Jeff.
6. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call.
7. Carried forward, unchanged: `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default has the setMonth single-hop overflow (UX-friction, not fixed).
8. Carried forward, unchanged: `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client with no "N skipped" signal (UX-clarity, not a bug).
9. Carried forward, unchanged: gap #18's `sms_marketing_opt_out` half stays open, Jeff's call.

## MISSING-FEATURE GAPS (carried forward except #22)

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
18. **PARTIALLY CLOSED**: `POST /api/reviews/request` had no SMS-consent check — the `sms_consent`/`do_not_service` half is fixed; the `sms_marketing_opt_out` half stays open, product call needed.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted~~ — CLOSED.
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call.
21. GDPR erasure requests do not reach `document_signers` — needs Jeff's call.
22. **Same missing-`sms_consent`-check pattern across client-facing SMS/email send sites** — now 16 real sites closed across this session (`client/book`, `client/reschedule`, `campaigns/[id]/send`, `campaigns/send`, `schedules/[id]/pause`, `team-portal/running-late`, `reviews/request`, `cron/payment-reminder`, `bookings`+`[id]`+`batch`, `cron/reminders`, `cron/follow-up`, `notifications`(15min_warning), `send-booking-emails`, `cron/post-job-followup`, `cron/confirmations`(client day-before), `cron/payment-followup-daily`); remaining 3 (`invoices/send`, `quotes/send`, `portal/collect`) need Jeff's call. Structural-fix proposal (moving the check into `notify()` itself) still awaits Jeff's sign-off — see NOTICED #2. This round's 3 finds prove the "exhaustive" claim from 2 rounds ago was premature; a dedicated repo-wide grep for every raw `sendSMS(`/`sendEmail(` call site NOT yet cross-checked against a consent-gate commit would be the next fresh-ground candidate if this keeps recurring.
23. ~~Monthly trend/breakdown buckets silently dropped real revenue/signup data~~ — CLOSED.
24. ~~`schedules/[id]/pause` and `team-portal/running-late` client SMS never checked `sms_consent`/`do_not_service`~~ — CLOSED.
25. ~~Bulk marketing campaigns (email + SMS) never checked `do_not_service`~~ — CLOSED.
26. Carried forward, unchanged: possible duplicate-feature gap between `cron/follow-up` and `cron/reminders`' embedded thank-you pass (see NOTICED #1) — not confirmed as a bug, flagging for Jeff to clarify which is authoritative.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail.
3. "Ops Admin" and "Performance" tabs on the Team page — confirmed genuinely unbuilt.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners with no indication.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.
6. `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default can suggest a date off by up to a few days on a day-29/30/31 "now" — cosmetic, editable before submit.
7. `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client from the send with no "N skipped" signal in the response/UI — correct behavior, just invisible to the admin who picked them.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+test, 1× `test(sim)`, 1× `docs`).
