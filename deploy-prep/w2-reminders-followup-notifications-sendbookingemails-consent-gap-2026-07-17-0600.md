# W2 gap/fluidity refresh — 2026-07-17 06:00

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-payment-reminder-sms-consent-gap-2026-07-17-0527.md`.

Leader's fresh 3-deep queue this round: (1) continue archetype depth, (2) map `notify()`'s untouched call sites into a structural-fix proposal doc — design only, (3) keep gap/fluidity current. All 3 done — see below.

## Fresh ground (real bugs) — 4 more call sites of the missing-consent-check bug class, the 10th through 13th this session, and apparently the LAST ones

Went looking for the next real target by mapping every `notify({recipientType:'client', channel:'email'|'sms', ...})` call site through the shared `src/lib/notify.ts` helper (the structural gap NOTICED'd last round). The prior round's "swept every remaining `sendSMS`/`sendEmail` call site" claim was scoped to *direct* `sendSMS()`/`sendEmail()` calls — it didn't cover call sites that go through `notify()` instead, which turned out to have its own uncovered ground.

1. **`GET /api/cron/reminders`** — the hourly reminders cron. Three separate client-facing sends inside this one file, all ungated: the day-based reminder (client confirmation email via `notify()` + client SMS via raw `sendSMS()`), the hour-based 2hr-before SMS reminder, and the 3-day-later thank-you email (`type: 'follow_up'`). Fires on every scheduled/confirmed booking, every hour the cron runs — likely the highest-frequency site in the whole sweep, bigger even than last round's bookings routes, since it runs unattended on a schedule rather than per admin action.
2. **`GET /api/cron/follow-up`** — a *second*, separate cron file doing the same "3-day post-service thank-you" job as #1's embedded thank-you pass (apparent duplicate feature, not investigated further — out of this round's scope, flagging below). Ungated the same way.
3. **`POST /api/notifications` (`type: '15min_warning'`)** — the "team wrapping up in 15 min, here's your estimated total" client text, triggered by an admin/team action. Fired on `client_id` presence alone — no consent check at all, not even a phone-presence check (the phone lookup happens inside `notify()` itself).
4. **`POST /api/send-booking-emails`** — an admin "resend booking confirmation" endpoint (email or SMS, admin's choice). Fired on `client.id` presence alone regardless of channel.

A `do_not_service` (banned) or `sms_consent=false` (STOP-revoked) client still got real booking-reminder texts every hour this cron ran, a real thank-you marketing email 3 days after every completed job (twice, from two separate cron files), a real mid-job SMS whenever an admin/team member triggered the 15-min heads-up, and a real resend whenever an admin manually resent a confirmation.

**Fixed**: every client email send across all 4 files now also gates on `!do_not_service`; every client SMS send now also gates on `sms_consent !== false && !do_not_service`, same convention as every other client fan-out this session. Added two new shared client-record types (`ClientNamePhoneEmailConsent`, `ClientNameEmailConsent`) to `src/lib/types.ts` rather than inlining ad-hoc casts, matching the existing `Pick<ClientRecord, ...>` pattern already used for every other booking-join shape in that file.

16 new tests across 4 files (7 + 2 + 3 + 4), mutation-verified via `git apply -R`/`git apply` on each fixed route file in isolation — every BLOCKED assertion failed for the right reason when the corresponding fix was reverted, CONTROL assertions confirmed the always-allowed path stayed unaffected.

`npx tsc --noEmit`: clean. `eslint` on all touched files: 0 errors, only pre-existing warnings (3 `any`-type warnings in `cron/reminders/route.ts` already flagged in prior rounds, plus the same `_opts`-unused-var pattern already established in `bookings/route.sms-consent-guard.test.ts`). Full suite: 534 files (was 530), 2398 tests total (was 2382) — 2361 passed + 37 skipped, 0 failed, 0 regressions (+16 new tests).

No DB migration needed — `sms_consent`/`do_not_service` both already exist on `clients`.

## Structural-fix proposal — `notify()` consent gate (design only, per leader's explicit scope)

Wrote `w2-notify-consent-gate-structural-proposal-2026-07-17-0557.md`: a complete, verified census of every `recipientType: 'client'` call site through the shared `notify()` helper (7 files, every one now gated as of this round — the census is exhaustive, not a sample, confirmed by grepping every `recipientType:` value in the codebase and finding zero dynamic/variable assignments to check for), plus the concrete design for moving the check into `notify()` itself so call site #8 (whatever it turns out to be) is safe by construction instead of by convention. No code changed in `notify.ts`. Key points: nulling `email`/`phone` before the existing send-attempt branches reuses the existing `'skipped'`/`UNROUTABLE` classification with zero new status-handling code; every current call site's own gate makes this provably redundant-safe to ship whenever Jeff greenlights it; the one open design question is whether a hypothetical future client-facing `payment_received` receipt should be exempt from the gate (a legal/product call, not an engineering default — recommended as an explicit opt-in exception list, not a carve-out).

## Archetype depth

Added `sim-all-trades.ts` section 5a-27, same pattern as every prior 5a-1x/2x round — proves all 4 fixed predicates (cron/reminders day+hour, cron/follow-up, notifications 15min_warning, send-booking-emails resend) against real `bookings`/`clients` rows in the live schema through each route's exact column selection, including the send-booking-emails case where a STOP-revoked (but not banned) client should still be reachable on the email channel while blocked on SMS. **Not yet executed** — `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers); flagging for the leader to run alongside the prior rounds' still-outstanding checks (5a-20 through 5a-27). Verified statically: `tsc --noEmit` clean, `eslint` clean (0 errors, same pre-existing warnings, none from the new section).

## NOTICED — not fixed, flagging for the leader/Jeff

1. **New**: `cron/follow-up/route.ts` and `cron/reminders/route.ts`'s embedded thank-you pass (lines ~360-418) appear to be two separate implementations of the same "3-day post-service thank-you email" feature — different window math (`check_out_time` ± 1hr vs `end_time` in a fixed 8am-only day-window), different dedup logic (1-year lookback by type+recipient vs "first booking only" via a completed-bookings count), same `type: 'follow_up'` notification type and near-identical copy. Both are now consent-gated so neither is a live bug, but if both crons are actually deployed/scheduled a client could get the thank-you email twice from two different code paths on two different schedules. Not investigated further this round (out of scope for a consent-check sweep) — worth a dedicated round or a direct question to Jeff on which one is the "real" one.
2. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` still not merged into this worktree.
3. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` — product-classification calls, need Jeff.
4. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) — staying with Jeff.
5. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call.
6. Carried forward, unchanged: `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default has the setMonth single-hop overflow (UX-friction, not fixed).
7. Carried forward, unchanged: `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client with no "N skipped" signal (UX-clarity, not a bug).
8. Carried forward, unchanged: gap #18's `sms_marketing_opt_out` half stays open, Jeff's call.

## MISSING-FEATURE GAPS (carried forward, unchanged this round)

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
22. **Same missing-`sms_consent`-check pattern across client-facing SMS/email send sites** — now 13 real sites closed across this session (`client/book`, `client/reschedule`, `campaigns/[id]/send`, `campaigns/send`, `schedules/[id]/pause`, `team-portal/running-late`, `reviews/request`, `cron/payment-reminder`, `bookings`+`[id]`+`batch`, `cron/reminders`, `cron/follow-up`, `notifications`(15min_warning), `send-booking-emails`); remaining 3 (`invoices/send`, `quotes/send`, `portal/collect`) need Jeff's call. **Structural gap now has a design proposal**: see `w2-notify-consent-gate-structural-proposal-2026-07-17-0557.md` for the full call-site census (now believed exhaustive — 7/7 shared-`notify()` client-facing sites gated) and the proposed fix to move the check into `notify()` itself. Not implemented — design only, awaiting Jeff's sign-off on the one open question (payment-receipt carve-out).
23. ~~Monthly trend/breakdown buckets silently dropped real revenue/signup data~~ — CLOSED.
24. ~~`schedules/[id]/pause` and `team-portal/running-late` client SMS never checked `sms_consent`/`do_not_service`~~ — CLOSED.
25. ~~Bulk marketing campaigns (email + SMS) never checked `do_not_service`~~ — CLOSED.
26. **New, possible duplicate-feature gap**: `cron/follow-up/route.ts` and `cron/reminders/route.ts`'s embedded thank-you pass may be two independent implementations of the same feature (see NOTICED #1) — not confirmed as a bug, flagging for Jeff to clarify which is authoritative.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail.
3. "Ops Admin" and "Performance" tabs on the Team page — confirmed genuinely unbuilt.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners with no indication.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.
6. `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default can suggest a date off by up to a few days on a day-29/30/31 "now" — cosmetic, editable before submit.
7. `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client from the send with no "N skipped" signal in the response/UI — correct behavior, just invisible to the admin who picked them.

File-only, no push/deploy/DB. 2 commits this round (1× `fix`+`test` combined, 1× `docs`+proposal).
