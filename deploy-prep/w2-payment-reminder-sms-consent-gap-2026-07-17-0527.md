# W2 gap/fluidity refresh — 2026-07-17 05:44

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-reviews-request-sms-consent-gap-2026-07-17-0518.md`.

Two fresh-ground findings this round, both the same missing-consent-check bug class, found in sequence while sweeping every remaining `sendSMS`/`sendEmail` call site for this doc's NOTICED section (a first draft of that sweep claimed the `bookings` routes were "already clean" — that was wrong, caught before it shipped, and turned into the second finding below instead).

## Fresh ground #1 (real bug) — `cron/payment-reminder`'s +15min client nudge never checked sms_consent/do_not_service

Another genuinely new call site beyond the original 5-site census (`invoices/send`, `quotes/send`, `portal/collect`, `client/book`, `client/reschedule`), same shape as the schedule-pause/running-late find two rounds ago. `GET /api/cron/payment-reminder` (every-5-min cron; +15min "still unpaid" gentle nudge, +60min admin escalation) is a *separate* cron file from `payment-followup-daily` (the daily 8am/12pm/6pm chase W1 fixed on p1-w1, commit `359c1d50`) — same real-money "chase until paid" shape, same TCPA exposure, different file. The generic (non-nycmaid) path selected only `clients(name, phone)` and called the raw consent-blind `sendSMS()` on phone-presence alone. A client who'd texted STOP or was flagged `do_not_service` still got a real payment-chase text roughly every 5 minutes this cron ran. (The NYC Maid tenant-scoped path was already safe — it routes through `sendClientSMS()`, which checks `do_not_service` internally.)

**Fixed**: the +15min nudge now also gates on `client.sms_consent !== false && !client.do_not_service`. The +60min admin escalation is deliberately left ungated — it contacts the tenant owner, not the client.

5 new tests, mutation-verified. `npx tsc --noEmit`: clean.

## Fresh ground #2 (real bug, bigger by volume) — `POST/PUT/DELETE /api/bookings` (+`[id]`, +`batch`) never checked sms_consent/do_not_service

The PRIMARY admin-facing booking create/update/cancel paths every non-project tenant uses — the 9th call site of this bug class this session, and the highest-frequency one found so far (fires on every single booking created, confirmed, rescheduled, or cancelled by staff, not just overdue-payment edge cases).

- `POST /api/bookings` (create): the client confirmation email fired unconditionally — `if (data.clients?.phone || true)`, where the `|| true` made the phone check a structural no-op — and the confirmation SMS fired on phone presence alone.
- `PUT /api/bookings/[id]` (update): confirm-on-status-change (email + SMS) and reschedule-on-time-change (SMS) — all 3 sends gated only on phone/client-id presence.
- `DELETE /api/bookings/[id]` (cancel): cancellation email + SMS, same gap.
- `POST /api/bookings/batch` (bulk multi-date create, first row only): confirmation SMS gated on phone presence; confirmation email — a direct `sendEmail()` call, not routed through `notify()` — gated on email presence alone.

A `do_not_service` (banned) or `sms_consent=false` (STOP-revoked) client still got real booking-lifecycle emails/texts on every admin-created, -updated, or -cancelled booking, and on every bulk multi-date create.

**Fixed**: every email send now also gates on `!do_not_service`; every SMS send now also gates on `sms_consent !== false && !do_not_service`, same convention as every other client fan-out this session.

14 new tests across 3 files, mutation-verified via `git apply -R`/`git apply` — every BLOCKED/CONTROL assertion failed for the right reason when reverted. Writing the `bookings/[id]` test surfaced a real test-harness limitation (not a route bug): the shared `createTenantDbHarness` returns live object references from `.select()`, so the route's pre-update `oldBooking` read and the later `.update()` on the same row share the same object — the update retroactively mutates the earlier read too, permanently masking the status/time diff the confirm/reschedule branches depend on. Worked around with a hand-rolled `bookings` table mock that shallow-copies on read (matching real Postgres SELECT-is-a-snapshot semantics); did not touch the shared harness itself.

`npx tsc --noEmit`: clean (both rounds). Full suite after both fixes: 530 files (was 526), 2382 tests total (was 2363) — 2345 passed + 37 skipped, 0 failed, 0 regressions (+19 new tests across both findings).

No DB migration needed for either finding — `sms_consent`/`do_not_service` both already exist on `clients`.

## Archetype depth

Added `sim-all-trades.ts` sections 5a-25 (payment-reminder) and 5a-26 (bookings create/update/cancel), same pattern as every prior 5a-1x/2x round — proves each fixed predicate against real `bookings`/`clients` rows in the live schema through the exact column selections the fixed routes now use. **Not yet executed** — `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers); flagging for the leader to run alongside the prior rounds' still-outstanding checks (5a-20 through 5a-26). Verified statically: `tsc --noEmit` clean, `eslint` clean (0 errors, same 3 pre-existing warnings, none from either new section).

## NOTICED — not fixed, flagging for the leader/Jeff

1. **New, real, and bigger than either fix above — a structural gap in the shared `notify()` helper itself (`src/lib/notify.ts`)**: `notify()` fetches a client's `email`/`phone` directly (lines ~152-156) and sends on presence alone — it never checks `do_not_service` (or `sms_consent`) for ANY call site, for ANY channel. It has a tenant-level comm-preference gate (`isCommEnabled` via `NOTIFY_COMM_MAP`), but that's a per-tenant feature toggle, not a per-client consent check. This round's fixes worked around it at each call site by checking `do_not_service` *before* calling `notify()` (same pattern as the direct `sendSMS()`/`sendEmail()` fixes), which is correct and sufcient for the sites touched — but `notify()` has many more call sites across the codebase (`booking_reminder`, `follow_up`, `daily_summary`, `payment_received`, `booking_received`, etc.) that were NOT audited this round and may have the same gap for their client-facing email leg. This deserves a dedicated round auditing every `notify({recipientType:'client', channel:'email'/'sms', ...})` call site, or — better — fixing it once at the `notify()` layer itself so every current and future call site is covered by construction. Deliberately NOT attempted unilaterally this round: it's a shared helper with call sites this session hasn't fully mapped, and a blanket change risks silently altering behavior (e.g. payment receipts, which arguably should still send even to a banned client since the money already moved) without that review. Flagging as the single highest-value next fresh-ground target.
2. Swept the remaining `sendSMS`/`sendEmail` call sites not covered by #1 above or an already-established consent-check: `admin/comhub/send`, `admin/find-cleaner/send`, `admin/message-applicants/send`, `bookings/broadcast`, `routes/[id]/publish` are staff/crew/applicant recipients (crew-termination gating is the correct guard there, already closed). `client/confirm/[token]`, `client/send-code`, `documents/public/[token]/sign`, `pin-reset`, `portal/auth` are client-initiated (texting them the thing they just asked for right now), not the class of proactive contact `sms_consent`/`do_not_service` exist to gate. `admin/selena/route.ts`, `selena/route.ts`, `sms/route.ts`, `sms/send/route.ts` are admin/AI-initiated manual sends, not automated fan-out. `admin/payments/confirm-match` checked clean on this axis.
3. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` still not merged into this worktree.
4. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` — product-classification calls, need Jeff.
5. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) — staying with Jeff.
6. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call.
7. Carried forward, unchanged: `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default has the setMonth single-hop overflow (UX-friction, not fixed).
8. Carried forward, unchanged: `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client with no "N skipped" signal (UX-clarity, not a bug).
9. Carried forward, unchanged: gap #18's `sms_marketing_opt_out` half stays open, Jeff's call.

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
22. **Same missing-`sms_consent`-check pattern across client-facing SMS send sites** — now 9 real sites closed across this session (`client/book`, `client/reschedule`, `campaigns/[id]/send`, `campaigns/send`, `schedules/[id]/pause`, `team-portal/running-late`, `reviews/request`, `cron/payment-reminder`, and `bookings`+`[id]`+`batch` as one combined site this round); remaining 3 (`invoices/send`, `quotes/send`, `portal/collect`) need Jeff's call. **New structural gap surfaced this round**: the shared `notify()` helper itself never checks `do_not_service`/`sms_consent` for any call site — see NOTICED #1, the likely next real target.
23. ~~Monthly trend/breakdown buckets silently dropped real revenue/signup data~~ — CLOSED.
24. ~~`schedules/[id]/pause` and `team-portal/running-late` client SMS never checked `sms_consent`/`do_not_service`~~ — CLOSED.
25. ~~Bulk marketing campaigns (email + SMS) never checked `do_not_service`~~ — CLOSED.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail.
3. "Ops Admin" and "Performance" tabs on the Team page — confirmed genuinely unbuilt.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners with no indication.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.
6. `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default can suggest a date off by up to a few days on a day-29/30/31 "now" — cosmetic, editable before submit.
7. `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client from the send with no "N skipped" signal in the response/UI — correct behavior, just invisible to the admin who picked them.

File-only, no push/deploy/DB. 4 commits this round (2× `fix`+`test` combined, 2× `test(sim)`), this `docs` makes 5.
