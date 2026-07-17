# W2 gap/fluidity refresh — 2026-07-17 05:18

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-campaigns-do-not-service-gap-2026-07-17-0510.md`.

## Fresh ground (real bug) — `reviews/request` never checked sms_consent/do_not_service

Gap #18 was open in this doc's lineage for most of tonight's session, carried forward round after round as "product-classification call, needs Jeff." Re-reading the original classification (from `w2-apology-batch-sms-consent-guard-2026-07-17-0213.md`): the actual ambiguity was always about `sms_marketing_opt_out` — whether a post-job "please leave us a review" ask counts as *marketing* (opt-out-gated) or *transactional* (not) is genuinely a judgment call, and that piece is correctly still left open below.

But that reasoning never applied to `sms_consent` or `do_not_service`, and this session's later rounds made that distinction explicit and load-bearing: `payment-followup-daily`'s fix (05:09, commit `359c1d50`) established that `sms_consent` (the literal TCPA STOP-reply flag) must gate **every** further send once revoked, "not just marketing sends" — a client who opts out of a carrier relationship via STOP has opted out of all of it, transactional or not. `do_not_service` is even less ambiguous — it's the codebase-wide "NEVER contact" flag, enforced on every other single-client action this session touched (`client/book`, `client-auth.ts`, `campaigns/send`, `payment-processor.ts`) regardless of transactional/marketing classification.

`POST /api/reviews/request` selected only `name, email, phone` off `clients` and sent both an email and an SMS unconditionally on presence — no `sms_consent` check, no `do_not_service` check at all (not even the ambiguous `sms_marketing_opt_out` one). A client the business had explicitly banned, or who had replied STOP to any prior message, still got a "how was your experience, please leave us a review" email/text every time an admin clicked "Request Review" on their record.

**Fixed**: `do_not_service` now blocks the whole action — 403, no review row created, no send on either channel — matching `client/book`'s single-client-action convention (block-before-side-effects, not silent-skip). `sms_consent !== false` now gates the SMS leg only, since STOP only revokes SMS consent, not email (same scope every other fix this session applies). `sms_marketing_opt_out` is deliberately left unchecked — see NOTICED below, unchanged from gap #18's original classification.

4 new tests (`route.consent-guard.test.ts`): do_not_service BLOCKED (both channels + 403 + no review row), sms_consent=false BLOCKED-SMS-only (email still sent, proving the two flags are independently scoped), CONTROL (both channels sent), sms_consent=null/undefined CONTROL (legacy rows default to allowed, matching every other gate this session). Mutation-verified via `git apply -R`/`git apply` — both BLOCKED assertions failed for the right reason (`sendSMS` called when it shouldn't have been), restored green.

`npx tsc --noEmit`: clean. Full suite: 526 files (was 525), 2363 tests total (was 2359) — 2326 passed + 37 skipped, 0 failed, 0 regressions (+4 new tests).

No DB migration needed — `sms_consent`/`do_not_service` both already exist on `clients`, just weren't selected/checked by this route.

## Archetype depth — reviews/request consent gate live-schema probe

Added `sim-all-trades.ts` section 5a-24 (after 5a-23). Same `requirePermission`-needs-`headers()`/`cookies()` constraint as 5a-18/5a-22/5a-23 — proves the fixed predicate against a real `clients` row in the live schema through the exact column selection the fixed route now uses. Unlike 5a-22 (two sites, both per-channel-gated) and 5a-23 (campaigns, also per-channel), this route's `do_not_service` blocks the **whole action** while `sms_consent` gates only the SMS leg — proven as two independently-asserted predicates against DNS/STOP/control client rows, not one combined gate.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers) — flagging for the leader to run alongside the prior rounds' still-outstanding checks (5a-20 through 5a-23). Verified statically: `tsc --noEmit` clean, `eslint` clean (0 errors, same 3 pre-existing warnings, none from this section).

## NOTICED — not fixed, flagging for the leader/Jeff

1. **Reclassified, not newly opened**: gap #18 closes for its `sms_consent`/`do_not_service` half; the `sms_marketing_opt_out` half stays open and unfixed — whether a review-request ask should honor the marketing opt-out link-click (as opposed to the STOP/banned flags, which are absolute) is still Jeff's call, same as the original 02:13 classification. If Jeff wants it gated the same way as `campaigns`, the fix is a one-line addition to the now-existing guard.
2. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` still not merged into this worktree (re-confirmed via `git log --all`). Not re-touched.
3. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` — product-classification calls, need Jeff.
4. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) — staying with Jeff.
5. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call.
6. Carried forward, unchanged: `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default has the setMonth single-hop overflow (UX-friction, not fixed).
7. Carried forward, unchanged: `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client with no "N skipped" signal (UX-clarity, not a bug).
8. New, checked and confirmed clean: `document_signers` (the e-sign feature's recipient table) has **no `client_id` column at all** — signers are entered manually (name/email/phone) per-document, not linked to the `clients` table. Read `documents/[id]/send/route.ts` end-to-end while scanning for more consent-check gaps: it's structurally impossible for this route to check `sms_consent`/`do_not_service` today, since there's no client row to check against. Not a bug — a different subsystem with no client link, not an oversight. Noting so a future round doesn't re-investigate the same dead end.
9. Carried forward, unchanged: terminated-crew hunt and RBAC missing-`requirePermission` hunt both still confirmed dry.

## MISSING-FEATURE GAPS (carried forward, unchanged; #18 partially closed)

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
18. **PARTIALLY CLOSED this round**: `POST /api/reviews/request` had no SMS-consent check — the `sms_consent`/`do_not_service` half is now fixed (see Fresh ground above); the `sms_marketing_opt_out` half stays open, product call needed.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted~~ — CLOSED (`lib/recurring.ts`, `finance/cash-flow/route.ts`; `cron/recurring-expenses` fixed on `p1-w1`, not merged here).
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call.
21. GDPR erasure requests do not reach `document_signers` — needs Jeff's call.
22. Same missing-`sms_consent`-check pattern across 5 client-facing SMS send sites — 2 of 5 CLOSED; remaining 3 need Jeff's call.
23. ~~`admin/analytics`, `finance/revenue`, and `admin/finance`'s monthly trend/breakdown buckets silently dropped real revenue/signup data~~ — CLOSED.
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

File-only, no push/deploy/DB. 2 commits this round (1× `fix`+`test` combined, 1× `test(sim)`), this `docs` makes 3.
