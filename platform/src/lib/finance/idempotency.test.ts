import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Webhook idempotency — money must not double-apply on duplicate delivery.
 *
 * Stripe redelivers webhooks (network timeout, manual replay, at-least-once
 * delivery). Every money-touching path in the Stripe webhook posts to the
 * ledger through these finance helpers, keyed on a natural Stripe id:
 *
 *   checkout.session.completed  → postPaymentRevenue   (source='payment'|'booking')
 *   charge.refunded             → postRefundToLedger    (source_id = Stripe refund id)
 *   charge.dispute.created      → postChargebackToLedger (source_id = Stripe dispute id)
 *   quote deposit paid          → postDepositToLedger   (source_id = quote id)
 *
 * Each helper guards with journalEntryExists(tenant, source, source_id) before
 * calling postJournalEntry. This suite proves the guard holds: a SECOND delivery
 * of the same event is a no-op — the journal entry (and therefore the revenue /
 * refund / chargeback / deposit) is applied exactly once.
 *
 * These tests model SEQUENTIAL redelivery (Stripe's normal retry): the first
 * call posts the entry, so the row exists when the second call checks. That is
 * the delivery mode the current guard actually protects against. The remaining
 * CONCURRENT-delivery gap (two deliveries both passing the existence check
 * before either inserts, because journal_entries has only a NON-unique index on
 * (tenant_id, source, source_id)) is documented in
 * /tmp/w2-webhook-idempotency.md — it cannot be closed in application code
 * without a DB unique constraint, so it is out of scope for a unit test.
 */

// ── In-memory ledger mock that behaves like the real check-then-insert guard ──
// postJournalEntry records the (tenant, source, source_id) key; journalEntryExists
// reports true once a key has been posted. This is exactly the sequential
// redelivery ordering: deliver #1 posts, deliver #2 sees it and skips.
const posted = new Set<string>()
const key = (t: string, s: string, id: string) => `${t}|${s}|${id}`

const postJournalEntry = vi.fn(async (opts: { tenant_id: string; source?: string; source_id?: string }) => {
  posted.add(key(opts.tenant_id, opts.source || 'manual', opts.source_id || ''))
  return `entry_${posted.size}`
})

vi.mock('../ledger', () => ({
  postJournalEntry: (opts: { tenant_id: string; source?: string; source_id?: string }) => postJournalEntry(opts),
  journalEntryExists: async (tenantId: string, source: string, sourceId: string) =>
    posted.has(key(tenantId, source, sourceId)),
  ensureChartAccounts: async () => {},
  getAccountIdByCode: async (_tenantId: string, code: string) => `acct_${code}`,
}))

// postPaymentRevenue reads the payment row from supabaseAdmin. Return a single
// completed booking-linked payment. Refund/dispute/deposit helpers take the
// amount directly and never touch supabaseAdmin.
const PAYMENT_ROW = {
  id: 'pay_1',
  amount_cents: 12000,
  tip_cents: 2000,
  status: 'completed',
  method: 'stripe',
  booking_id: 'book_1',
}

function paymentsBuilder() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data: PAYMENT_ROW, error: null }),
  }
  return chain
}

vi.mock('../supabase', () => ({
  supabaseAdmin: { from: () => paymentsBuilder() },
}))

import { postDepositToLedger, postRefundToLedger, postChargebackToLedger } from './post-adjustments'
import { postPaymentRevenue } from './post-revenue'

const TENANT = 'tenant_1'

beforeEach(() => {
  posted.clear()
  postJournalEntry.mockClear()
})

describe('Stripe webhook idempotency — duplicate event does not double-apply', () => {
  it('checkout.session.completed: a redelivered payment posts revenue exactly once', async () => {
    const first = await postPaymentRevenue({ tenantId: TENANT, paymentId: 'pay_1' })
    const second = await postPaymentRevenue({ tenantId: TENANT, paymentId: 'pay_1' })

    expect(first.posted).toBe(true)
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('charge.refunded: a redelivered refund reverses the sale exactly once', async () => {
    const opts = { tenantId: TENANT, sourceId: 're_ABC123', amountCents: 12000, memo: 'Refund · booking 1a2b3c4d' }
    const first = await postRefundToLedger(opts)
    const second = await postRefundToLedger(opts)

    expect(first.posted).toBe(true)
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('charge.dispute.created: a redelivered dispute records the loss exactly once', async () => {
    const opts = { tenantId: TENANT, sourceId: 'dp_ABC123', amountCents: 12000, memo: 'Chargeback / dispute' }
    const first = await postChargebackToLedger(opts)
    const second = await postChargebackToLedger(opts)

    expect(first.posted).toBe(true)
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('quote deposit paid: a redelivered checkout posts the deposit liability exactly once', async () => {
    const opts = { tenantId: TENANT, sourceId: 'quote_1', amountCents: 5000, memo: 'Deposit Q-1001' }
    const first = await postDepositToLedger(opts)
    const second = await postDepositToLedger(opts)

    expect(first.posted).toBe(true)
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
    expect(postJournalEntry).toHaveBeenCalledTimes(1)
  })

  it('positive control: two DISTINCT refund ids each post (guard is per-source-id, not global)', async () => {
    await postRefundToLedger({ tenantId: TENANT, sourceId: 're_ONE', amountCents: 100 })
    await postRefundToLedger({ tenantId: TENANT, sourceId: 're_TWO', amountCents: 200 })
    expect(postJournalEntry).toHaveBeenCalledTimes(2)
  })

  it('cross-tenant control: same refund id under two tenants posts once per tenant', async () => {
    // source_id alone is not globally unique; the guard is (tenant, source, id).
    await postRefundToLedger({ tenantId: 'tenant_A', sourceId: 're_SHARED', amountCents: 100 })
    await postRefundToLedger({ tenantId: 'tenant_B', sourceId: 're_SHARED', amountCents: 100 })
    await postRefundToLedger({ tenantId: 'tenant_A', sourceId: 're_SHARED', amountCents: 100 }) // dup of #1
    expect(postJournalEntry).toHaveBeenCalledTimes(2)
  })

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  it('MASKED-ERROR PROBE: normalizes a raw Stripe refund id into a valid UUID before it reaches journal_entries.source_id (a UUID column) — the un-normalized id raises Postgres 22P02 in production, which the webhook route\'s .catch() silently swallows, so real refunds never actually reach the ledger', async () => {
    await postRefundToLedger({ tenantId: TENANT, sourceId: 're_LiveStripeRefundId123', amountCents: 500 })
    const call = postJournalEntry.mock.calls.at(-1)?.[0] as { source_id?: string }
    expect(call.source_id).toMatch(UUID_RE)
  })

  it('MASKED-ERROR PROBE: normalizes a raw Stripe dispute id into a valid UUID before it reaches journal_entries.source_id', async () => {
    await postChargebackToLedger({ tenantId: TENANT, sourceId: 'dp_LiveStripeDisputeId456', amountCents: 500 })
    const call = postJournalEntry.mock.calls.at(-1)?.[0] as { source_id?: string }
    expect(call.source_id).toMatch(UUID_RE)
  })
})
