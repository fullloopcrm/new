# W2 gap/fluidity refresh — 2026-07-17 05:10

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-schedule-pause-running-late-sms-consent-gap-2026-07-17-0456.md`.

## Fresh ground (real bug) — marketing campaigns (email + SMS) never checked do_not_service

Not another instance of the `sms_consent`/`do_not_service` missing-*consent*-check pattern this session's 5 prior fixes cover — those were all *transactional* client SMS (payment confirmations, booking summaries, ETA updates). This is a different subsystem entirely: `POST /api/campaigns/[id]/send` and `POST /api/campaigns/send` are the **bulk marketing** email/SMS blast paths (`/dashboard` → Campaigns), and both already enforced the per-channel marketing opt-outs (`email_marketing_opt_out`, `sms_marketing_opt_out`, `sms_consent`) correctly — but neither selected or checked `do_not_service` at all.

`do_not_service` is the codebase-wide **"NEVER contact"** flag — its own comment in `selena-legacy-core.ts` literally says `// DNS FILTER — NEVER contact do_not_service clients`, and it gates every other outbound fan-out found this session: `payment-processor.ts`, `client-auth.ts`, `selena-legacy.ts`'s AI outreach, and (as of this session's earlier fixes) every transactional client SMS site. A client the business explicitly banned — for a dispute, harassment, a restraining-order-type situation, whatever prompted the flag — could still receive bulk marketing email and SMS campaigns indefinitely, including when an admin explicitly targeted them by `client_ids` in `campaigns/send`'s targeted-send path (that path bypasses the `status='active'` filter entirely but still had no `do_not_service` check).

**Fixed**: both routes' `clients(...)` selects now include `do_not_service`, and every send gate (`campaigns/[id]/send`'s direct email/SMS sends; `campaigns/send`'s `campaign_recipients` row builder, which gates both the insert AND the eventual `notify()` dispatch since only inserted rows ever get sent) now also requires `!client.do_not_service`.

5 new tests across 2 files (`route.do-not-service-guard.test.ts` in each directory) — BLOCKED (do_not_service=true client gets neither channel / no recipient row), CONTROL (non-banned client still reached on both channels), plus a `sentCount`/recipient-row-count assertion proving the banned client is excluded from the numbers, not just skipped silently while still counted.

`npx tsc --noEmit`: clean. Full suite: 525 files (was 523), 2359 tests total (was 2354) — 2322 passed + 37 skipped, 0 failed, 0 regressions (+5 new tests).

No DB migration needed — pure application-layer gate, no schema change (the column already existed, just wasn't selected).

## Archetype depth — campaigns do_not_service gate live-schema probe

Added `sim-all-trades.ts` section 5a-23 (after 5a-22). `requirePermission` needs `headers()`/`cookies()` this harness doesn't have, so — same reasoning as 5a-18/5a-22's route-level probes — this proves the fixed predicate against a real `clients` row in the live schema through the exact column selection both campaign routes now use, rather than calling the routes directly. Also proves the email-leg and SMS-leg predicates independently (unlike 5a-22, this fix spans two channels with two separate gate expressions).

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase, blocked by local hook for workers) — flagging for the leader to run alongside 5a-20/5a-21/5a-22's still-outstanding checks. Verified statically: `tsc --noEmit` + `eslint` clean project-wide (0 errors; pre-existing warnings only, none from this section).

## NOTICED — not fixed, flagging for the leader/Jeff

1. Carried forward, unchanged: `p1-w1`'s `91919561` fix to `cron/recurring-expenses/route.ts`'s `advance()` still not merged into this worktree (re-confirmed via `git log --all`). Not re-touched.
2. Carried forward, unchanged, still 3 of the original 5 flagged `sms_consent` sites: `invoices/[id]/send`, `quotes/[id]/send`, `portal/collect` — product-classification calls, need Jeff.
3. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18).
4. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) — staying with Jeff.
5. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call.
6. Carried forward, unchanged: `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default has the setMonth single-hop overflow (UX-friction, not fixed).
7. New, not fixed (scoped question, not guessed at): `campaigns/send`'s `client_ids`-targeted path lets an admin explicitly select any client by ID, bypassing the `status='active'` filter entirely (a deliberate feature — e.g. re-engaging an inactive client). Now that `do_not_service` is enforced there too, an admin who explicitly picks a banned client's ID will see them silently excluded from `total`/`sent` with no error surfaced in the response — correct behavior (never contact), but the UI has no visible "N recipients skipped: do_not_service" signal today. Flagging as a UX-clarity gap, not a bug — the block itself is correct and intentional.
8. New, not fixed: while reading `campaigns/send/route.ts`'s `PUT` retry handler, confirmed it does NOT need its own `do_not_service` re-check — it only retries rows already present in `campaign_recipients`, and rows for banned clients are now never inserted in the first place (verified, not guessed).
9. Carried forward, unchanged: terminated-crew hunt and RBAC missing-`requirePermission` hunt both still confirmed dry.

## MISSING-FEATURE GAPS (carried forward, unchanged; +1 new)

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
23. ~~`admin/analytics`, `finance/revenue`, and `admin/finance`'s monthly trend/breakdown buckets silently dropped real revenue/signup data~~ — CLOSED.
24. ~~`schedules/[id]/pause` and `team-portal/running-late` client SMS never checked `sms_consent`/`do_not_service`~~ — CLOSED.
25. **NEW, CLOSED this round**: bulk marketing campaigns (email + SMS) never checked `do_not_service` — see Fresh ground above. A client the business explicitly banned could still be blasted with marketing sends, including via explicit `client_ids` targeting.

## UX-FRICTION (carried forward, unchanged; +1 new)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail.
3. "Ops Admin" and "Performance" tabs on the Team page — confirmed genuinely unbuilt.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners with no indication.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member.
6. `BookingsAdmin.tsx`'s create/edit-modal `repeat_end_date` default can suggest a date off by up to a few days on a day-29/30/31 "now" — cosmetic, editable before submit.
7. New: `campaigns/send`'s `client_ids`-targeted path silently excludes a `do_not_service` client from the send with no "N skipped" signal in the response/UI (see NOTICED #7) — correct behavior, just invisible to the admin who picked them.

File-only, no push/deploy/DB. 2 commits this round (1× `fix`+`test` combined, 1× `test(sim)`), this `docs` makes 3.
