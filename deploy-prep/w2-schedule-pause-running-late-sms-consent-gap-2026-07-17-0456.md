# W2 gap/fluidity refresh — 2026-07-17 04:56

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-lastnmonths-revenue-signup-trend-drop-2026-07-17-0445.md`.

## Fresh ground (real bug) — schedules/[id]/pause + team-portal/running-late client SMS never checked sms_consent or do_not_service

Fifth and sixth call sites of the missing-consent-check bug class this session, after `payment-processor.ts`, `webhooks/stripe.ts`, `client/book/route.ts`, and `client/reschedule/[id]/route.ts` — but NOT part of the "5 same-pattern call sites" census gap #22 already tracks (`invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` remain the 3 open from that original list). These two are a fresh discovery from a broader sweep of every `sendSMS`/`sendSms` call site in `src/app/api` and `src/lib`.

`POST /api/schedules/[id]/pause` cancels a client's upcoming bookings inside the pause window and texts them a summary (`Your recurring service is paused until... We've cancelled N upcoming visits`) — gated only on `client?.phone` truthiness. `POST /api/team-portal/running-late` (a crew member self-reporting they're behind schedule) texts the client an ETA update — gated only on `clientPhone` truthiness. Neither route's `clients(...)` select even fetched `sms_consent`/`do_not_service`, so there was no data in scope to check. A client who had texted STOP (`sms_consent=false`) or been flagged `do_not_service` kept getting texted by both routes indefinitely — the pause-notification text in particular could fire multiple times a month for an active recurring-service client.

**Fixed**: both routes' `clients(...)` selects now include `sms_consent, do_not_service`, and both SMS sends gate on `sms_consent !== false && !do_not_service`, matching the codebase-wide invariant every other client SMS site enforces. `running-late`'s admin-facing SMS is unaffected — it never involved client consent, only the client-facing leg changed.

9 new tests across 2 files (`route.sms-consent-guard.test.ts` in each directory) — BLOCKED (sms_consent=false), BLOCKED (do_not_service=true with sms_consent=true, proving the two axes are independently enforced), CONTROL (both false/consented), CONTROL (sms_consent=null defaults to allowed, matching the codebase-wide opt-out model), plus one CONTROL confirming running-late's admin SMS still fires regardless of client consent state.

`npx tsc --noEmit`: clean. Full suite: 523 files (was 521), 2354 tests total (was 2345) — 2317 passed + 37 skipped, 0 failed, 0 regressions (+9 new tests).

No DB migration needed — pure application-layer gate, no schema change (the columns already existed, just weren't selected).

## Archetype depth — schedules/pause + running-late sms_consent/do_not_service gate live-schema probe

Added `sim-all-trades.ts` section 5a-22 (after 5a-21). `requirePermission`/`requirePortalPermission` need `headers()`/`cookies()` this harness doesn't have, so — same reasoning as 5a-11/5a-18's route-level probes — this proves the fixed predicate against real `clients` rows in the live schema, plus (new wrinkle beyond 5a-18's direct-table read) a real `recurring_schedules` row's embedded `clients(...)` join, which is what `schedules/[id]/pause` actually reads through.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers) — flagging for the leader to run alongside 5a-20/5a-21's still-outstanding checks. Verified statically: `tsc --noEmit` clean project-wide.

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
11. Carried forward, unchanged (retroactive-data question): monthly revenue/signup trend under-reporting on any past day-29/30/31 view — nothing to correct in the DB, only a past *view* was wrong.
12. New, not fixed (minor, UX-caliber not data-caliber): `BookingsAdmin.tsx`'s create/edit-modal default `repeat_end_date` (`endDate.setMonth(endDate.getMonth() + 3)`, 5 call sites in that one file) is the same single-hop `setMonth` overflow class as 5a-21/gap #23, but it only seeds an editable form-default field an admin sees and can change before submit — e.g. today Jan 31 defaults to a May-1 suggestion instead of Apr 30. Not fixed: severity is UX-friction (wrong-by-a-day suggested default), not data loss like the trend-chart instance, and `BookingsAdmin.tsx` is a large React component outside this round's budget — flagging rather than half-fixing.
13. New, not fixed: broader sweep of every `sendSMS`/`sendSms` call site in `src/app/api` + `src/lib` (this round's source for the fresh find above) surfaced no other ungated client-facing sends beyond the two fixed here and the 3 already-tracked-open sites in NOTICED #2/gap #18 — the remaining call sites either target admin/team-member phones (no consent axis) or are OTP/confirmation-of-the-client's-own-just-taken-action texts (`client/send-code`, `client/confirm/[token]`, `pin-reset`) where consent isn't the applicable gate. Documenting the sweep as complete so it doesn't get re-run from scratch next round.

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
22. Same missing-`sms_consent`-check pattern across 5 client-facing SMS send sites — 2 of 5 CLOSED; remaining 3 need Jeff's call. (Note: `schedules/[id]/pause` and `team-portal/running-late`, closed this round, were a SEPARATE discovery outside this original 5-site count — see gap #24.)
23. ~~`admin/analytics`, `finance/revenue`, and `admin/finance`'s monthly trend/breakdown buckets silently dropped real revenue/signup data on any day-29/30/31 "now"~~ — CLOSED.
24. **NEW, CLOSED this round**: `schedules/[id]/pause` and `team-portal/running-late` client SMS never checked `sms_consent`/`do_not_service` — see Fresh ground above. A full sweep of every `sendSMS` call site (NOTICED #13) found no further ungated sites beyond these two plus the already-tracked gap #18/#22 items.

## UX-FRICTION (carried forward, unchanged; +1 new)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail.
3. "Ops Admin" and "Performance" tabs on the Team page — confirmed genuinely unbuilt.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners with no indication.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.
6. New: `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default can suggest a date off by up to a few days on a day-29/30/31 "now" (see NOTICED #12) — cosmetic, editable before submit.

File-only, no push/deploy/DB. 3 commits this round (1× `fix`+`test` combined, 1× `test(sim)`, this `docs`).
