# W2 gap/fluidity refresh — 2026-07-17 02:13

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-bookings-broadcast-terminated-crew-gap-2026-07-17-0203.md`.

## Fresh ground (real bug) — broadened past terminated-crew: `send-apology-batch`'s opt-out check read a dead legacy column

Per the leader's note to broaden the search once terminated-crew was nearing exhaustion, widened the bug-class search from "client-supplied id trusted without HR re-validation" to the sibling class: "consent/opt-out field trusted without checking it's the field that's actually written." Surveyed every route that sends bulk/marketing SMS to clients (`campaigns/send`, `campaigns/[id]/send`, `cron/outreach`, `cron/retention`, `reviews/request`, `admin/send-apology-batch`) against the two live opt-out writers: `clients.sms_marketing_opt_out` (set by `/api/unsubscribe`'s link-click flow) and `clients.sms_consent` (set `false` by the Telnyx STOP-reply webhook).

Most were fine or intentionally scoped: `campaigns/send` and `campaigns/[id]/send` already check both fields correctly. `cron/retention` and `cron/outreach` check `sms_consent`. `reviews/request` is a single-client admin-triggered action (not a blast) with no consent check at all — flagged below as a NOTICED item rather than fixed, since it's arguably transactional (post-job follow-up) rather than marketing, and changing that classification is a product call, not obviously a bug the way the others are.

One real hit: `POST /api/admin/send-apology-batch` (bulk "here's a discount credit, sorry for the trouble" SMS blast) selected and checked `clients.sms_opt_in` — the **original** `schema.sql` column (`sms_opt_in BOOLEAN DEFAULT true`), predating the `sms_consent`/`sms_marketing_opt_out` pair added later by `013_full_parity.sql`/`007_missing_tables.sql`. Confirmed by grep: nothing in the live codebase writes `sms_opt_in` anywhere — it's read-only (displayed on the client detail page, checked here). Neither the STOP webhook nor `/api/unsubscribe` ever touches it. So the route's opt-out skip branch (`if (c.sms_opt_in === false)`) was permanently dead code — it could never fire, because the column never leaves its `true` default. A client who explicitly texted STOP or clicked an unsubscribe link would still receive this blast.

**Fixed**: select `sms_consent, sms_marketing_opt_out` instead of `sms_opt_in`, skip condition `c.sms_marketing_opt_out || c.sms_consent === false` — same predicate `campaigns/send` already uses. 4 new tests (`route.consent-guard.test.ts`: two BLOCKED cases — unsubscribe-link and STOP-reply — plus CONTROL and MIXED). Mutation-verified: reverting the guard line to `if (false)` flipped 3 of 4 new tests RED (both BLOCKED cases + MIXED; CONTROL is guard-independent by design), restored clean. tsc clean. Full suite: 509/509 files, 2268/2305 passed + 37 skipped, 0 regressions (exactly +4 over the prior round's 2264).

## Archetype depth — send-apology-batch SMS consent guard

Added `sim-all-trades.ts` section 5a-11 (after 5a-10, same archetype block, no `helper?.id` gate needed since this bug isn't crew-side). Creates three real client rows in the archetype tenant — one with `sms_marketing_opt_out:true`, one with `sms_consent:false`, one control with neither — then re-reads them and applies the exact fixed-route predicate against live data, proving both new opt-out paths are caught and the control still sends.

**Not yet executed**: `sim-all-trades.ts` is leader-run-only (touches live prod Supabase; blocked by local hook for workers) — flagging for the leader to run and confirm the new checks pass alongside 5a-10's. Verified statically: `tsc --noEmit` clean project-wide, section drives the exact predicate now live in the fixed route.

## NOTICED — not fixed, flagging for the leader/Jeff

1. `POST /api/reviews/request` (admin-triggered, single-client "ask for a review" action) has zero consent check — selects only `name, email, phone`, ignores `sms_consent`/`sms_marketing_opt_out` entirely. A client who texted STOP would still get a review-request text. Not fixed this round: unlike the bulk-blast routes, this is a single admin-initiated transactional action tied to a specific just-completed job, and whether review requests should be gated by *marketing* opt-out (vs. transactional consent, which TCPA treats differently) is a product classification call, not an obvious bug the way a dead-column check is. Flagging for a decision — if Jeff wants it gated the same way, the fix is identical in shape to this round's (one field-set swap, no dead code).
2. This broadened search (opt-out-field-divergence rather than HR-termination) found exactly one real hit out of six candidate routes surveyed — narrower vein than the terminated-crew class was, but confirms the "field divergence" bug shape (same one W1/W4 have independently hit this session) recurs across different domains. Future rounds may want to check other divergent-field pairs proactively (e.g., `email_opt_in` — same original-schema/never-written pattern as `sms_opt_in` — worth a dedicated pass if any route still reads it; grep at fix time showed zero live readers, so not an active bug, just noting the same landmine shape exists on the email side too).

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
18. `POST /api/reviews/request` has no SMS-consent check (see NOTICED #1) — open, product call needed on transactional-vs-marketing classification.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there (write-time blocked both sides now, but the list itself still doesn't say so).
