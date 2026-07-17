# W2 gap/fluidity refresh — 2026-07-17 04:04

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-gdpr-purge-client-contacts-quotes-gap-2026-07-17-0348.md`.

## Fresh ground (real bug) — client payment-confirmation SMS never checked sms_consent/do_not_service

Second instance this round of the same bug class 5a-17 opened last round (a client-facing SMS/comms fan-out silently skipping the STOP-compliance gate every OTHER client-messaging site in the codebase enforces), found in a genuinely different subsystem: real-money payment confirmation, not GDPR purge.

`payment-processor.ts`'s `processPayment()` — the canonical path for manual (Zelle/Venmo/cash/admin-confirmed) payment confirmations — sends two SMS on a successful payment: one to the team member (bilingual finish-up message) and one to the client ("Payment confirmed... thank you"). The team-member leg correctly gated on `teamMember.sms_consent !== false`. The client leg, right below it in the same function, had **no consent check at all** — it fired unconditionally off `clientRecord.phone`. A client who'd replied STOP to any prior SMS (which flips `clients.sms_consent` to `false` via the Telnyx inbound webhook, `src/app/api/webhooks/telnyx/route.ts`) or been marked `do_not_service` kept getting a real payment-confirmation text on every single manual payment confirmation, forever — the STOP mechanism's entire purpose (once revoked, no more texts) was silently defeated for this one send site.

Found the identical shape in `src/app/api/webhooks/stripe/route.ts`'s parallel "SMS client a thank-you" branch while scoping the fix — there it was actually worse: **neither** leg (team member or client) checked `sms_consent`. Both files fixed in the same pass:

- `payment-processor.ts`: `clients` select now also fetches `sms_consent, do_not_service`; the client SMS block gates on `clientRecord.sms_consent !== false && !clientRecord.do_not_service`.
- `webhooks/stripe/route.ts`: `team_members`/`clients` joins now also fetch `sms_consent` (+`do_not_service` for clients); both the cleaner SMS and the client thank-you SMS are gated accordingly.

This is a correctness bug, not a product-classification call like gap #18 (`reviews/request`'s missing consent check, still open) — `sms_consent` is the literal STOP-reply flag; once a carrier/consumer revokes consent, every further send (not just marketing) must stop until they text START again. The asymmetry (team-member leg gated, client leg not, in the exact same function) is the tell that this was an oversight, not a deliberate transactional-message exemption.

2 new commits' worth of regression lock: `payment-processor.client-sms-consent.test.ts` (new, 4 cases: BLOCKED on sms_consent=false, BLOCKED on do_not_service=true, CONTROL on sms_consent=true, CONTROL on sms_consent=null defaulting to allowed) + `webhooks/stripe/route.tenant-scope.test.ts` (extended, 4 new cases on the booking-pay branch: positive control both legs sent, client-blocked/cleaner-still-sent, client do_not_service blocked, cleaner-blocked/client-still-sent). Mutation-verified via `git apply -R`/`git apply` on both fix files — reverting made exactly the BLOCKED-case assertions fail for the right reason (`sendSMS` called with the gated recipient's phone when it shouldn't have been): 2/4 red in the payment-processor suite, 3/8 red in the route suite, both restored to green. `npx tsc --noEmit` clean. Full suite: 517/517 files (up from 516 — the 1 new test file), 2293/2330 non-flaky passed + 37 skipped (up from 2286/2323 — net +8 tests, matching the 4+4 new cases); the only failure was `finance-export.test.ts`'s pre-existing 200k-row perf test timing out under full-suite parallel load, confirmed unrelated by re-running it standalone (passes in 1.7s alone).

No DB migration needed — `sms_consent` and `do_not_service` both already exist on `clients` (used tenant-wide elsewhere: `campaigns/send`, `cron/outreach`, `cron/retention`, `admin/send-apology-batch`, `notify-team.ts`, `notify-team-member.ts`).

## Archetype depth — processPayment() sms_consent/do_not_service gate

Extended `sim-all-trades.ts` with section 5a-18 (after 5a-17). Creates a real BLOCKED (`sms_consent=false`) client and a real CONTROL (`sms_consent=true`) client in this archetype tenant, runs each through the real `processPayment()` against a real booking, and asserts two things the fully-mocked vitest suites can't: (1) the exact `clients.sms_consent`/`do_not_service` columns the new gate reads exist on the live prod schema with the expected names/values (re-read post-write, confirmed `false`/`true` as seeded); (2) adding the guard clause didn't regress the core payment-recording path — both clients' payments still record and their bookings still reach `payment_status='paid'`. Deliberately does NOT attempt to observe whether `sendSMS` itself fired — this archetype tenant has no `telnyx_api_key`/`telnyx_phone` configured (same convention as every prior scenario in this harness, per 5a-13's blast-radius note), so the send is always a no-op regardless of consent either way; that observation is what the mutation-tested unit suites are for, not this harness.

**Not yet executed**: leader-run-only (touches live prod Supabase). Verified statically: `tsc --noEmit` clean project-wide; `eslint` clean (only pre-existing, unrelated warnings elsewhere in the file).

## NOTICED — not fixed, flagging for the leader/Jeff

1. **New this round, HIGH priority**: the missing-`sms_consent`-check pattern this round fixed in 2 files recurs in several more client-facing `sendSMS()` call sites using the global `@/lib/sms` wrapper — found while scoping but deliberately NOT swept blind in this round (each may have its own subtleties worth checking individually, e.g. whether the "to" number is the client's own tracked phone or a manually-entered one):
   - `src/app/api/invoices/[id]/send/route.ts:88`
   - `src/app/api/quotes/[id]/send/route.ts:103`
   - `src/app/api/portal/collect/route.ts:276`
   - `src/app/api/client/book/route.ts:402` (does check `do_not_service` at line 74 for a different purpose earlier in the route — worth checking whether that check actually reaches the SMS block, or whether `sms_consent` specifically is still unchecked)
   - `src/app/api/client/reschedule/[id]/route.ts:117`
   
   Recommend a dedicated round to audit each of these individually rather than a blanket fix — some may already have `sms_consent` checked upstream in ways a grep-only pass would miss (client/book's `do_not_service` check is one such case that needs a closer read before assuming it's a gap).
2. Carried forward, unchanged: `POST /api/reviews/request` has zero SMS-consent check (gap #18) — product-classification call, still open.
3. Carried forward, unchanged: retroactive-repair-of-already-drifted-`monthly_date`-prod-data question (gap #19's NOTICED) — needs a live-DB audit, not guessed at.
4. Carried forward, unchanged: gap #20's root cause (nothing unassigns/surfaces a terminated worker's existing future bookings) is still open — staying with Jeff per the leader's explicit instruction.
5. Carried forward, unchanged: the client-facing 2-hour SMS reminder still names a terminated crew member by first name (cosmetic).
6. Carried forward, unchanged: calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member (display-layer gap, see UX-FRICTION #5).
7. Carried forward, unchanged: `document_signers` outside the GDPR purge's reach (gap #21) — needs Jeff's call, not a unilateral build.
8. Carried forward, unchanged: the terminated-crew hunt and the RBAC missing-`requirePermission` hunt are both still confirmed dry — this round's fresh ground again came from a third area (payment-confirmation SMS consent), same pivot pattern as last round's GDPR purge.

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
22. **New this round**: same missing-`sms_consent`-check pattern recurs across 5 more client-facing SMS send sites (see NOTICED #1) — needs a dedicated audit round, not a blind sweep.

## UX-FRICTION (carried forward, unchanged)

1. Change orders have no dedicated feature (manual total-bump + job_payments insert workaround, no structural link).
2. Cancellation kill-fees are ad hoc math, no stored policy field, no audit trail for the %.
3. "Ops Admin" and "Performance" tabs on the Team page (same dead-tab pattern as "Payroll") — confirmed genuinely unbuilt, carried forward as-is.
4. `GET /api/client/preferred-cleaner`'s `familiar_cleaners` list surfaces terminated former cleaners by name with no indication they no longer work there.
5. Calendar/dashboard/bookings-list views have no way to visually flag an already-assigned terminated crew member — same root cause and "flag, don't fix without Jeff's call" treatment as item #4 above and gap #20.

File-only, no push/deploy/DB. All 4 commits this round (1× `fix`, 1× `test`, 1× `test(sim)`, this `docs`) local to this worktree.
