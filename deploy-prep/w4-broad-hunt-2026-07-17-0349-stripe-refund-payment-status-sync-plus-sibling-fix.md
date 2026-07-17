# W4 broad hunt — 2026-07-17 03:49

## Queue (03:36 LEADER order)
1. Continue cross-archetype HR/payroll/finance depth.
2. Continue fresh-ground hunting.
3. Keep gap/fluidity current.

One finding covers (1)+(2): it's a genuinely new trigger (Stripe webhook
refund path, never touched before tonight) discovered by going one layer
deeper on the exact ledger/dashboard finance work from the last two rounds
(3883c2d7, 4121759e, df38f7fd/f10de5f5).

## (1)+(2) Real finding: Stripe refunds never synced `bookings.payment_status`

**Root cause.** `POST /api/webhooks/stripe`'s `charge.refunded` handler
correctly posts the ledger reversal (`postRefundToLedger` — `DR 4000 Service
Revenue / CR 1050 Undeposited`, tenant-scoped, idempotent). But it never
touched the booking row. Grepped the whole repo for every place
`payment_status: 'refunded'` gets written: the ONLY one is Selena's own AI
tool (`handleProcessStripeRefund` in `src/lib/selena/tools.ts:1359`), which
sets it manually the instant *it* initiates a refund via the Stripe API.
Any refund processed the **normal** way — directly in the Stripe Dashboard,
an auto-refund flow, any integration outside Selena chat — only ever hit
the ledger and never flipped the booking.

**Impact.** Every booking-driven finance report reads `bookings.
payment_status`, not the ledger (confirmed: `dashboard`, `pnl`, `cash-flow`,
`ar-aging`, `summary` are all `bookings.payment_status`-driven — this
session's earlier partial-payment fixes already established that). A
refunded booking kept reading `payment_status='paid'`/`'partial'` forever,
so the dashboard's revenue-collected total, P&L's revenue, cash-flow's
"already paid, excluded" bucket, and the summary's headline numbers all
permanently overstated revenue by the refund amount — with zero mechanism
to ever self-correct, since nothing ever re-reads the ledger to reconcile
the booking row.

**Fix.** Added `syncBookingRefundStatus(tenantId, bookingId)` to
`lib/finance/post-adjustments.ts` (colocated with the other money-event ⇄
booking-state functions). The webhook now calls it after posting the
ledger reversal, gated on the refund being a **FULL** refund — Stripe's
`charge.amount_refunded` is cumulative across all refunds on that charge, so
comparing it against `charge.amount` correctly catches multi-part refunds
that add up to the full amount, not just a single-shot full refund.

**Partial refunds deliberately left alone.** There's no agreed operational
treatment yet for a partially-refunded booking — should `partial_payment_
cents` decrease? Does it need a `'partially_refunded'` status? That's a
product call, not guessed at here. Flagged below.

**Sibling bug this exposed, also fixed.** Once `'refunded'` becomes a state
reachable through the *normal* Stripe path (previously only reachable via
Selena's manual tool, so rarely hit), two of the finance reports fixed
earlier tonight turned out to have the identical blind spot for it that
they'd already been fixed for `'partial'`:
- `finance/cash-flow`'s inflow loop only excluded `payment_status==='paid'`
  — a refunded booking projected its FULL price as a still-incoming future
  cash event that will never arrive.
- `finance/summary`'s `pendingClientPayments` only excluded `'paid'` — same
  bug, told the operator a refunded client still owes the full amount.
- `finance/ar-aging` already excluded `'refunded'` correctly (`.not(
  'payment_status','in','(paid,refunded)')`) — confirmed as the reference
  pattern the other two now match.

This is a required consequence of my own change (making `'refunded'`
normally reachable), not scope creep — leaving it unfixed would have meant
my own fix made an existing-but-rare bug into a routine one.

**Not touched, flagged not guessed:** invoices can also carry a `'refunded'`
status (`src/lib/invoice.ts:51`, checked in 6 call sites) but **nothing
anywhere ever sets it** — not even Selena's tool, which is booking-only. An
invoice-linked Stripe refund (the webhook's `tenantFromPaymentIntent` path
already returns `bookingId: null` for those) gets a ledger reversal and
zero status sync of any kind. Same class of gap, but invoice refund-status
sync would need to also reconcile `amount_paid_cents`, which is more
invasive than the booking case — a separate, deliberately unscoped item.

## Verification

- 8 new tests across 4 files: `post-adjustments.sync-booking-refund-status.
  test.ts` (2), `webhooks/stripe/route.refund-status-sync.test.ts` (5 —
  full refund, partial refund, no-booking/invoice-only, cumulative
  multi-part refund reaching full, missing-`charge.amount` no-crash guard),
  plus 1 new assertion each in the existing `cash-flow` and `summary`
  partial-payment-double-count test files.
- Mutation-verified in two passes (`git diff` → `git apply -R` → confirm RED
  for the right reason → `git apply` → confirm GREEN): pass 1 on the
  refund-sync fix itself (4 assertions failed with `syncBookingRefundStatus
  is not a function` / zero sync calls), pass 2 on the cash-flow/summary
  sibling fix (both new assertions failed with the refunded booking's full
  price leaking into the total: 55000 vs expected 25000, 45000 vs expected
  15000).
- Also updated the existing `route.cross-tenant-refund.isolation.test.ts`'s
  module mock to include the new export (mock-only change, no new
  assertions there — that file's own tests were unaffected and still pass).
- `npx tsc --noEmit`: same 3 pre-existing baseline errors (2 in an unrelated
  marketing-site nav module, 1 in an unrelated xss test's mock typing) —
  identical baseline every prior session this branch has reported, none in
  touched files.
- Full suite: 474/475 files passed, 1905/1908 tests passed, 1 pre-existing
  self-labeled "RED until fixed" placeholder (`cron/tenant-health/status-
  coverage-divergence.test.ts`, untouched), 1 skipped. The known-flaky
  unrelated race test (`cron/generate-recurring/route.duplicate-occurrence-
  race.test.ts`) passed this run — re-confirmed flaky (2/3 passes) in 3x
  isolated re-runs, unrelated to anything touched this session. Zero
  regressions from either fix.

File-only, no push/deploy/DB writes. Commit `bc70bb0d`.

## Gap/fluidity — 1 item closed, 2 new items opened

- **CLOSED, remove from carried list**: Stripe refund → booking payment_
  status desync (commit `bc70bb0d`), plus the cash-flow/summary sibling
  blind spot for `'refunded'` it exposed.
- **New, flagged not fixed**: partial-refund operational treatment — no
  agreed answer for what happens to `partial_payment_cents` (or whether a
  distinct status is needed) when a booking is partially refunded. Real
  product question, not guessed at.
- **New, flagged not fixed**: invoice-linked refunds get a ledger reversal
  but zero status sync anywhere (not even Selena's tool covers invoices) —
  would need to also reconcile `amount_paid_cents`, more invasive than the
  booking fix above, deliberately unscoped this round.
- **Still open from the 03:37 report**: whether any live booking already
  has a second-payment ledger gap from before that session's ledger-topup
  fix — needs a read-only live-DB audit, Jeff's call.
- All other carried items unchanged from the 02:59/03:18/03:37 reports:
  crews `setMembers()` status-check question, `activate-tenant.ts`
  fragmentation, 6 client-side dropdowns showing inactive employees,
  `hr_documents_reviewed_by_name` still `_PROPOSED.sql`, referrer
  atomic-bump RPCs still `_PROPOSED.sql`, payments dedup unique index still
  unresolved, cancel-button hard-delete product call,
  `hr_document_reminders.document_id` CASCADE gap, `/api/client/recurring`'s
  dead `maxHoursClean`, `team_members.active`/`clients.active` drop-column
  migrations still `_PROPOSED.sql` pending Jeff's go, `journal_entries`
  dedup-constraint migration still `_PROPOSED.sql`.

Idle, awaiting next order.
