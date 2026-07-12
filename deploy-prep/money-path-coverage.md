# Money-Flow Test Coverage Map + Remaining Gaps (P1/W1)

**Status:** verified snapshot of what is and isn't tested across the money path,
as of the P1/W1 test wave (adds `money-spine.test.ts` + `money-adjustments.test.ts`).
**Source of truth:** the `platform/src/lib/**` modules and `platform/src/app/api/**`
routes named below — this maps real files to real tests, it is not a proposal.

The money path is: **quote/booking → invoice → payment lands → ledger entry →
labor/adjustment posting → reports.** Every ledger write must satisfy the
double-entry invariant (debits == credits) and be idempotent by `(source,
source_id)` so a webhook retry can't double-count. This doc records where that is
verified and where it is not.

---

## 1. Coverage map (module → test → what's asserted)

| Money-path stage | Source module | Test file | Covered? | What's asserted |
|---|---|---|---|---|
| Quote/invoice totals | `lib/quote.ts` `computeTotals`, `computeLineItemSubtotal`, `normalizeLineItems` | `lib/quote.test.ts` | ✅ | subtotal, discount clamp (≤ subtotal, ≥ 0), tax on taxable base, rounding, unselected optional items excluded |
| Invoice numbering + lifecycle | `app/api/invoices/route.ts`, `[id]/send`, webhooks/stripe | `app/api/invoices/invoice-lifecycle.test.ts` | ✅ (partial) | create→send→pay drives status draft→sent→paid; `INV-YYYYMM-NNNN`; tenant scope. **Mocks out `postPaymentRevenue`** — ledger not exercised here |
| Ledger core (double-entry) | `lib/ledger.ts` `postJournalEntry`, fingerprint, chart | `lib/ledger.test.ts` | ✅ | rejects unbalanced/empty entries; fingerprint determinism + dedup; `DEFAULT_CHART` invariants; `getAccountIdByCode`; `journalEntryExists` |
| **Revenue → ledger (e2e spine)** | `lib/finance/post-revenue.ts` `postPaymentRevenue` | **`lib/finance/money-spine.test.ts`** (NEW) | ✅ | booking→invoice→payment→ledger; DR 1050 / CR 4000 (amount−tip) / CR 4100 (tip); balanced; idempotent by booking; two-tenant isolation |
| **Deposit / refund / chargeback math** | `lib/finance/post-adjustments.ts` deposit/refund/chargeback | **`lib/finance/money-adjustments.test.ts`** (NEW) | ✅ | DR/CR account pairs + amounts; zero/negative rejected; idempotent by source id; tenant scope |
| **Payment tip-split edges** | `lib/finance/post-revenue.ts` amount/tip split | **`lib/finance/money-adjustments.test.ts`** (NEW) | ✅ | tipped split; pure-tip (no 4000 line); tip>amount rejected; zero rejected; partial-status posts |
| Cleaner pay rate | `lib/cleaner-pay.ts` | `lib/cleaner-pay.test.ts` | ✅ | rate resolution + location floor |
| Billing pricing / hours / tiers | `lib/billing-pricing.ts`, `billing-hours.ts`, `tier-prices.ts` | siblings `*.test.ts` | ✅ | pricing math (existing coverage) |

**Net new this wave:** the real revenue-posting spine and the deposit/refund/
chargeback math are now under test. Before this wave, `postPaymentRevenue` was
only ever *mocked* (in `invoice-lifecycle.test.ts`), and no `finance/**` module
had a test.

---

## 2. Remaining gaps (prioritized — money at risk)

### HIGH — untested money movement

1. **`lib/payment-processor.ts` `processPayment` — the entire non-Stripe money-in
   path (Zelle / Venmo / cash / admin-confirmed).** No test. This orchestrates:
   expected-balance (`actual_hours × rate`, else booked `price`, else check-in
   elapsed), the **95% partial-vs-paid threshold**, tip = received − expected,
   partial-shortfall admin task, and auto-payout via Stripe Connect. This is the
   most math-dense untested function in the money path. A wrong threshold or
   tip calc silently over/under-pays a cleaner.

2. **Stripe webhook branches other than `checkout.session.completed`.** The route
   (`app/api/webhooks/stripe/route.ts`) also handles `charge.refunded`,
   `charge.dispute.created`, `payment_intent.payment_failed`, `invoice.paid`
   (subscription), `invoice.payment_failed`, `customer.subscription.deleted`.
   Only the invoice checkout branch is tested. The **refund → `postRefundToLedger`
   and dispute → `postChargebackToLedger` wiring is untested** — the ledger
   *functions* are now tested (§1), but not that the webhook calls them with the
   right tenant + amount resolved via `tenantFromPaymentIntent`.

3. **Booking payment via the real fire-and-forget wiring.** `processPayment` calls
   `postPaymentRevenue(...).catch(...)` **without awaiting**. `money-spine.test.ts`
   calls `postPaymentRevenue` directly (deterministic), so the real not-awaited
   wiring inside `processPayment` is not exercised end-to-end.

### MEDIUM — untested but lower blast radius

4. **`lib/finance/post-labor.ts`** — `postPayoutToLedger`, `postPayrollToLedger`,
   `backfillUnpostedLabor` (COGS/labor: DR 5000 / CR 2450). No test.
5. **`lib/finance/post-adjustments.ts` commissions** — `postCommissionAccrual`,
   `postCommissionPayment`, `backfillUnpostedCommissions` (DR 6045 / CR 2400, then
   DR 2400 / CR 1010). The deposit/refund/chargeback fns in this file are now
   tested; the **commission fns are not**.
6. **`lib/finance/post-revenue.ts` backfills** — `backfillRevenueFromBookings`
   (price+tip split straight off `bookings.payment_status`) and
   `backfillUnpostedRevenue`. The idempotency key unification (booking-linked
   payments key on the booking, not the payment) is asserted for the real-time
   path in `money-spine.test.ts` but **not for the backfill net**.
7. **`lib/finance/reconcile.ts` `clearingTargets`** and **`lib/finance/ledger-reports.ts`**
   (`ledgerProfitAndLoss`, `ledgerBalanceSheet`, `ledgerTrialBalance`). No test.
   The trial balance is the report-level proof that the books balance — worth a
   test that a set of posted entries nets to debits == credits.

### LOW

8. `lib/invoice.ts` has no sibling test, but its math (`computeTotals`) is
   re-exported from `quote.ts` and covered there; only `generateInvoiceNumber` is
   invoice-specific and it's exercised via `money-spine.test.ts`.

---

## 3. Invariants that SHOULD hold everywhere money moves

Verified in at least one test; listed here as the contract every future money-path
change must preserve:

- **Balanced:** every journal entry has `sum(debit_cents) == sum(credit_cents) > 0`.
  Enforced in `postJournalEntry` (`ledger.test.ts`) and asserted per-entry in the
  two new finance tests.
- **Idempotent:** re-posting the same `(source, source_id)` is a no-op
  (`already_posted`). Asserted for revenue, deposit, refund, chargeback.
- **Tenant-scoped:** every entry + line carries `tenant_id`; one tenant's posting
  never appears under another. Asserted in both new files.
- **No negative revenue:** a tip that exceeds the amount is rejected, never posted
  as a negative credit. Asserted in `money-adjustments.test.ts`.
- **Deposit ≠ revenue:** a customer deposit posts to 2350 (liability), never 4000.
  Asserted in `money-adjustments.test.ts`.

---

## 4. Suggested next test order (if this lane continues)

1. `processPayment` partial/tip/expected-balance math (gap 1) — highest math risk.
2. Webhook refund + dispute → ledger wiring (gap 2) — money-out correctness.
3. `post-labor` payout/payroll posting (gap 4).
4. `ledgerTrialBalance` balance proof over a posted set (gap 7).

These are file-only unit/integration tests following the same in-memory-Supabase
+ emulated `post_journal_entry` RPC pattern established in `money-spine.test.ts`.
