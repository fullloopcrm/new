# W4 session report — 22:40 queue

LEADER order: fresh 3-deep queue (1) continue cross-archetype HR/payroll/
finance depth. (2) continue fresh-ground hunting. (3) keep gap/fluidity
current. File-only, no push/deploy/DB.

## (1) Archetype depth — bulk payroll's claim can re-pay a manually-paid booking

Traced from last session's team-pay double-pay-door theme: `POST /api/
finance/payroll`'s bookings claim (`.eq('status', 'completed')`) never
excluded bookings already settled out-of-band via `team_member_paid` (the
flag `POST /api/admin/bookings/[id]/cleaner-payout` sets for a manual
Zelle/Venmo/cash payout). `GET /api/finance/payroll`'s own "pending pay"
list already has this exact exclusion (`.or('team_member_paid.is.null,
team_member_paid.eq.false')`, fixed in an earlier session per route.
double-payout.test.ts) — but the POST claim, the query that actually flips
status and records `payroll_payments`, never applied it. Since cleaner-
payout never touches `status` (only `team_member_paid`), a manually-paid
booking stays `'completed'` and is fully re-claimable: pay a crew member
cash for a job, then later run bulk payroll for that member/period, and the
already-paid booking gets flipped to `'paid'` and its amount recorded a
SECOND time in `payroll_payments` — a real double payment reachable through
completely normal, sequential staff action, not a race.

Fixed by mirroring GET's exact `.or(...)` clause onto POST's claim query.
Confirmed 3 existing test files' mock chains didn't implement `.or()` at
all (would have silently no-op'd or thrown once the route called it) —
added `.or()` support to all three (`route.double-submit-race.test.ts`,
`route.period-scope.test.ts`, `route.server-computed-amount.test.ts`), plus
2 new tests in `route.claim-excludes-team-member-paid.test.ts` proving the
claim skips an already-paid booking and 409s when nothing else is owed.
Mutation-verified: reverted the `.or()` addition, both new tests failed for
the right reason (claimed/paid the wrong amount; 201 instead of 409),
restored. Commit `908b2d4c`.

## (1b) Archetype depth — payroll-prep undercounts gross pay and the 1099 YTD threshold

Same root finding, different report. `GET /api/finance/payroll-prep` (the
per-contractor gross-pay + 1099-flag report) queried `bookings.status=
'completed'` only. The instant bulk payroll flips a booking to `'paid'`, it
vanishes from this report's period gross pay AND — the more serious half —
the contractor's real year-to-date earnings used to decide the $600 1099
threshold. A contractor whose earnings were mostly already run through
bulk payroll could show as under-$600-YTD and never get flagged for a
1099, even having genuinely earned well over it — an IRS-reporting-risk
undercounting, not just a display glitch. Fixed both the period and YTD
booking queries to `.in('status', ['completed', 'paid'])`, and credited
`'paid'` bookings' pay to `paid_out_cents` (bulk payroll never writes a
`team_member_payouts` row, so without this the fix would create a phantom
`balance_owed_cents` for money already paid). 4 new tests in `route.
bulk-payroll-paid-status.test.ts` (gross pay includes the paid booking,
paid_out_cents credits it correctly, 1099 threshold correctly under/over
the line depending on whether the paid booking is counted). Mutation-
verified: reverted, all 4 new tests failed for the right reason (wrong
gross pay, wrong paid_out_cents, wrong threshold flag both directions),
restored. Commit `fed88e4a`.

## (2) Fresh ground — ar-aging and pending dashboards go blind on client debt once payroll runs

Same underlying cause (`bookings.status` overloaded to mean two different
things), a third and fourth place it bites, discovered while checking
whether the payroll-prep fix's pattern recurred elsewhere: `status`
(job/team-pay lifecycle: scheduled → ... → completed → paid) and
`payment_status` (the CLIENT's own payment: unpaid/partial/paid) are
completely independent fields — `POST /api/finance/payroll` flips `status`
based purely on whether the team member got paid, with zero regard for
whether the client ever did. `GET /api/finance/ar-aging` (Accounts
Receivable) and `GET /api/finance/pending` (the pending-collections
dashboard) both filtered bookings on `status='completed'` only. The moment
bulk payroll ran on a booking, it silently vanished from BOTH reports —
real, still-outstanding client debt (payment_status still `'unpaid'`)
disappearing from collections visibility for no reason other than the crew
having been paid. Both reports already have their own payment_status
gating (`ar-aging`'s `.not('payment_status', 'in', '(paid,refunded)')`,
`pending`'s `.or('payment_status.neq.paid,...')`) — this fix only widens the
outer `status` filter to `.in('status', ['completed', 'paid'])` so those
existing checks actually get a chance to run on paid-out jobs. New test
files for both (`ar-aging` had zero prior test coverage; `pending` did too)
proving a team-paid-but-client-owes booking still surfaces and a fully-
settled booking still doesn't. Mutation-verified both: reverted, both
failed for the right reason (booking missing from results / total_cents
short), restored. Commit `2480c7df`.

## (3) Gap/fluidity report

**MISSING-FEATURE / STRUCTURAL GAPS (not fixed — flagging for leader/Jeff):**

1. **New this session, same root cause, lower priority — not fixed:**
   `finance/pnl`'s `?source=raw` escape hatch (default path is the ledger,
   unaffected) and `finance/summary`'s labor-cost/job-count figures
   (`weekLabor`/`monthLabor`/`yearLabor`, `weekJobs`/`monthJobs`/`yearJobs`,
   the `cleanerTotals` breakdown) have the identical `status='completed'`-
   only blind spot — they'll undercount once payroll runs on a booking in
   the window. Confirmed `summary`'s actual REVENUE figures
   (weekRevenue/monthRevenue/yearRevenue) are NOT affected — those already
   come from `ledgerProfitAndLoss`, not the raw bookings table. This is an
   internal ops-dashboard undercounting (labor cost, job counts), not a
   client-money blind spot like ar-aging/pending — lower severity, but same
   fix shape (`.in('status', ['completed','paid'])`) would close it. Left
   for a future pass to keep this session's diffs reviewable per-fix.
2. **Carried, still open:** `team_pay`/`team_paid` (migration 009) vs
   `team_member_pay`/`team_member_paid` (migration 011) amount divergence —
   still a product call, not touched.
3. **Carried, still open:** `DELETE /api/deals/[id]` has no delete-guard.
4. **Carried, still open:** two-going-on-three tenant-creation doors
   reimplement activation independently.
5. **Carried, still open:** `hr_document_reminders.document_id` NOT NULL
   constraint; `reviewed_by_name` migration drafted, not applied.
6. **Carried, still open:** `autoReplyReviews()` cron has no claim/lock.
7. **Carried, still open:** referrer `total_earned`/`total_paid` atomic-bump
   RPC migrations drafted, not wired into any call site (re-confirmed 0
   `grep` hits this session too).
8. **Carried, still open:** payments-table dedup index
   (`2026_07_13_payments_reference_dedup_PROPOSED.sql`) still unapplied —
   `processPayment()`'s reference_id idempotency is application-level only.

**UX-FRICTION (carried, unchanged):**
1. Hard-delete 409s don't offer an inline "cancel/set inactive instead?"
   action.
2. HR onboarding badge/handoff gap and finance period-lock enforcement gap
   — block-vs-override policy isn't a worker's call.

## Verification

- `npx tsc --noEmit`: same 3 pre-existing baseline errors
  (`bookings/broadcast/route.xss.test.ts`, `sunnyside-clean-nyc/_lib/
  site-nav.ts` ×2), confirmed present before this session's changes. Zero
  new errors.
- `npx vitest run` on `src/lib`, `src/app/api/finance`, `src/app/api/
  bookings`, `src/app/api/admin/bookings`, `src/app/api/team-portal`,
  `src/app/api/team`: 163 files, 932 passed + 1 pre-existing skip, zero
  regressions.
- Mutation-verified all 3 fixes (reverted each, confirmed new tests fail
  for the right reason, restored).
- Commits: `908b2d4c` (bulk-payroll claim excludes team_member_paid),
  `fed88e4a` (payroll-prep counts 'paid' bookings for gross pay + 1099
  YTD), `2480c7df` (ar-aging + pending include 'paid' status so client-debt
  visibility survives payroll running).
- File-only session: no push, no deploy, no prod DB writes.
