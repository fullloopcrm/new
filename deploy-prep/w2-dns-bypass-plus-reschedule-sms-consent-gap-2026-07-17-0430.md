# W2 gap/fluidity refresh — 2026-07-17 04:30

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-payment-sms-consent-gap-2026-07-17-0404.md`.

## Fresh ground (real bugs) — dedicated audit of the 5 flagged sms_consent call sites (2 of 5 closed this round)

Last round's NOTICED #1 flagged 5 client-facing `sendSMS()` call sites with the same missing-`sms_consent`-check shape as the payment-processor.ts/webhooks-stripe.ts fix, and explicitly recommended reading each individually rather than a blind sweep. Did that this round for all 5; closed the 2 clearest and most severe, documenting the other 3 below rather than rushing them.

### Closed: `client/book/route.ts` — do_not_service bypass via email/phone match (worse than the sms_consent pattern: a real booking-creation bypass, not just a stray text)

The public, unauthenticated booking form accepts three ways to identify the customer: `body.client_id`, or `body.email`/`body.phone`. `do_not_service` was checked **only** for the `body.client_id` path (a `.maybeSingle()` lookup that also 404s a foreign/nonexistent id). The `body.email`/`body.phone` path matches an EXISTING client by email or phone (falling back to phone if email doesn't match) and never checked `do_not_service` at all before proceeding straight into `create_booking_atomic`. `do_not_service` is enforced almost everywhere else a client can act (client login, `protectClientAPI`, `verify-code`, every Selena chatbot tool, cron outreach) — this was the one path into the booking flow that a banned client (or anyone who knows their email/phone) could use to bypass the ban entirely and create a real booking, complete with the full admin-notify/email/SMS confirmation fan-out. Fixed: the matched-client path now re-checks `do_not_service` before any booking work runs, same 403 message as the `client_id` path.

While in the same function, also closed: the booking-received confirmation SMS never checked `sms_consent` at all (only `phone` + tenant Telnyx creds gated it) — same bug class as last round's payment-processor/stripe-webhook fix, third instance this session.

### Closed: `client/reschedule/[id]/route.ts` — reschedule-confirmation SMS never checked sms_consent

`do_not_service` is already covered upstream here — `protectClientAPI` (which every call to this route goes through) blocks a `do_not_service` client's session entirely, re-checked live on every request, not cached in the cookie. But `sms_consent` is a separate, still-authenticated axis: a client who replied STOP can still have a perfectly valid session (STOP only trips `sms_consent`, not `do_not_service`) and kept getting texted every time they rescheduled their own booking. Fixed: the SMS send now also gates on `sms_consent !== false`.

Both fixes: 7 new regression-lock tests across 2 new files (`route.dns-and-consent.test.ts`: 4 cases; `route.sms-consent-guard.test.ts`: 3 cases), mutation-verified via `git apply -R`/`git apply` — reverting flipped the BLOCKED-case assertions red for the right reason (403 became 200 on the DNS-match cases; `sendSMS` called when it shouldn't have been on the consent cases) both times, restored green. `npx tsc --noEmit` clean. Full suite: 519 files (518 passed, 1 failed), 2338 tests total (2300 passed + 37 skipped + 1 failed); the 1 failure was `finance-export.test.ts`'s pre-existing 200k-row perf test timing out under full-suite parallel load (same flake documented last round), confirmed unrelated by re-running standalone (passes in 1.78s alone).

No DB migration needed — `sms_consent`/`do_not_service` both already exist on `clients`, used tenant-wide elsewhere.

## Archetype depth — do_not_service/sms_consent live-schema probe

Extended `sim-all-trades.ts` with section 5a-19 (after 5a-18). Both fixes are inline route-handler logic (not extracted lib functions like `checkTeamAvailability` or `processPayment`), so — same documented constraint as every other guard-function probe in this archetype block (`requirePermission`/`protectClientAPI`/`getTenantFromHeaders` need request/cookie/header context this harness doesn't have) — they can't be called directly here. What the new section DOES prove against the real live schema: a `do_not_service` client and an `sms_consent`-revoked client both exist with the exact column names/values both fixes' WHERE-clause/gate-condition reads assume, including proving the `bookings→clients` embedded-join shape (`select('*, clients(*))')`) the reschedule fix's gate reads from returns `sms_consent` correctly through a real join, not just a flat select.

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide; `eslint` clean (only pre-existing, unrelated warnings elsewhere in the file — `IndustryKey`/`COMMS_BY_KEY` unused-var, not touched by this change).

## NOTICED — not fixed, flagging for the leader/Jeff

1. **Carried forward, still open, 3 of the original 5 flagged sites**: the missing-`sms_consent`-check pattern is confirmed present but genuinely more nuanced at these 3 — deliberately not rushed:
   - `src/app/api/invoices/[id]/send/route.ts:88` and `src/app/api/quotes/[id]/send/route.ts:103` — both are STAFF-initiated sends (behind `requirePermission`), not automated. Neither joins `clients` at all today (they read `invoice.contact_phone`/`quote.contact_phone`, a denormalized snapshot, optionally overridden by a staff-supplied `body.to_phone`). Both DO have a nullable `client_id` FK available (`invoices.client_id`, `quotes.client_id` — standalone invoices/quotes are allowed with no client on file). The right fix shape: when `client_id` is set AND no staff override phone was supplied, join `clients` and gate on `sms_consent`/`do_not_service` before sending; when standalone or staff-overridden, there's no client record to check against. Worth a closer read on whether staff-initiated transactional sends (as opposed to fully automated ones) should even be gated the same way — recommend Jeff's call on the staff-override case specifically, the client_id-linked case is a clear bug either way.
   - `src/app/api/portal/collect/route.ts` (recap SMS in the Selena chatbot handoff, ~line 276) — this is public lead-capture; the existing-client match only selects `id, status`, no consent columns, so the recap SMS confirming "we're scheduling you" fires with zero consent check on a resubmission that matches an existing client. Lower severity than `client/book`'s bypass (no actual `bookings` row is created here — it's lead-capture + a descriptive text, not a real booking), but still a real business-policy violation if the matched client is `do_not_service` (implies committing to service someone the business banned) or `sms_consent=false`. Complicated by the fact that this fires only within a live inbound SMS conversation (`convo.phone` implies the person is actively texting Selena right now) — whether an active inbound conversation should be treated as fresh re-engagement/implied consent for THIS send, independent of the `sms_consent` flag, is a product-classification call in the same vein as gap #18 (`reviews/request`), not a unilateral fix. Recommend Jeff's call.
2. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
3. Carried forward, unchanged: retroactive-repair-of-already-drifted-`monthly_date`-prod-data question (gap #19's NOTICED) — needs a live-DB audit, not guessed at.
4. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open — staying with Jeff per the leader's explicit instruction.
5. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic).
6. Carried forward, unchanged: calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member (display-layer gap, see UX-FRICTION #5).
7. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call, not a unilateral build.
8. Carried forward, unchanged: terminated-crew hunt and RBAC missing-`requirePermission` hunt both still confirmed dry.
9. Updated from last round's #22: 2 of the 5 flagged sms_consent sites closed this round (`client/book`, `client/reschedule`); the remaining 3 (invoices/send, quotes/send, portal/collect) need the staff-override/product-classification calls above before fixing — see NOTICED #1.

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
12. ~~Recurring-schedule assignment has no terminated-crew check~~ — CLOSED (all callers).
13. The "Projects" feature (multi-day span bookings) has no real staffing, pricing, or stage-progression model past creation-with-`price:0`. Not fixed — needs a product call.
14. ~~`service_type` free-text field may be silently unset/stale~~ — CLOSED (prior round).
15. ~~`recurring_type` free-text field may go stale~~ — VERIFIED NON-ISSUE (prior round).
16. ~~Mass-SMS find-cleaner broadcast had no HR-termination check~~ — CLOSED (prior round).
17. ~~`bookings/broadcast`'s mass SMS/email had no HR-termination check~~ — CLOSED (prior round).
18. `POST /api/reviews/request` has no SMS-consent check — open, product call needed.
19. ~~`generateRecurringDates()`'s `monthly_date` branch permanently drifted~~ — CLOSED (prior round). Retroactive-repair question still open — see NOTICED #3.
20. **No unassignment/surfacing of a terminated worker's existing future bookings/recurring schedules** — open, needs Jeff's call.
21. GDPR erasure requests do not reach `document_signers` — needs Jeff's call on scope before any code gets written.
22. ~~Same missing-`sms_consent`-check pattern across 5 client-facing SMS send sites~~ — 2 of 5 CLOSED this round (`client/book`, `client/reschedule`); remaining 3 need Jeff's call on staff-override/active-conversation nuances (see NOTICED #1).

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member — same root cause and "flag, don't fix without Jeff's call" treatment as item #4 above and gap #20.

File-only, no push/deploy/DB. All 4 commits this round (1× `fix`, 1× `test`, 1× `test(sim)`, this `docs`) local to this worktree.
