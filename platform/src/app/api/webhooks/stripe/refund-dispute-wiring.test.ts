/**
 * Stripe webhook → ledger WIRING for refunds + disputes (P1/W1 queue item a).
 *
 * money-path-coverage.md HIGH gap #2: the ledger *functions* (postRefundToLedger,
 * postChargebackToLedger) are now unit-tested in money-adjustments.test.ts, but
 * NOT that the `charge.refunded` / `charge.dispute.created` webhook branches call
 * them with the right tenant, the right idempotency key (`source_id`), and the
 * right amount. A wrong key double-refunds; a wrong/missing tenant posts a
 * money-out entry to the wrong books or drops it silently. This is money OUT, so
 * it's the highest-blast-radius wiring left after processPayment (gap #1).
 *
 * Scope of this test = the WIRING, not the ledger math. We drive the REAL webhook
 * POST handler with a mocked Stripe (constructEvent returns the event we feed) and
 * SPY on the three post-adjustments entrypoints, asserting the exact args. The
 * ledger-write correctness those spies stand in for is already covered elsewhere.
 *
 * Invariants pinned here:
 *   - one refund object → one post, keyed by the Stripe REFUND id (not the charge)
 *     with that refund's own amount (no charge-level double count);
 *   - empty refunds list → single fallback post keyed by charge id + amount_refunded;
 *   - dispute → chargeback keyed by dispute id + amount, plus a high-priority task;
 *   - tenant unresolved (no matching payment) → NOTHING posts. Money never lands
 *     on the wrong tenant's books, and a refund with no payment_intent is inert.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

// hoisted store for the supabase fake (admin_tasks insert in the dispute branch)
const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

// hoisted spies + a settable tenant resolution, reachable from the vi.mock factory.
const adj = vi.hoisted(() => ({
  resolved: null as {
    tenantId: string
    bookingId: string | null
    paymentId?: string | null
    amountCents?: number
    status?: string | null
  } | null,
  postRefund: vi.fn(() => Promise.resolve({ posted: true })),
  postChargeback: vi.fn(() => Promise.resolve({ posted: true })),
  postDeposit: vi.fn(() => Promise.resolve({ posted: true })),
}))
const stripeEvent = vi.hoisted(() => ({ current: null as unknown }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
// Spy on the ledger entrypoints — the branch under test wires INTO these.
vi.mock('@/lib/finance/post-adjustments', () => ({
  tenantFromPaymentIntent: vi.fn(() => Promise.resolve(adj.resolved)),
  postRefundToLedger: adj.postRefund,
  postChargebackToLedger: adj.postChargeback,
  postDepositToLedger: adj.postDeposit,
}))
// Stripe — no network, no real key. constructEvent just returns the fed event.
vi.mock('stripe', () => ({
  default: class {
    webhooks = { constructEvent: () => stripeEvent.current }
  },
}))

import { POST as stripeWebhook } from './route'

function post() {
  return stripeWebhook(
    new Request('http://acme.example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=sig' },
      body: JSON.stringify({ id: 'evt_1' }),
    }),
  )
}

const TENANT = 'tenant-A'
const BOOKING = 'bk_1234abcd-0000'

beforeEach(() => {
  h.seq = 0
  h.store = { admin_tasks: [], payments: [], bookings: [] }
  adj.resolved = { tenantId: TENANT, bookingId: BOOKING }
  adj.postRefund.mockClear()
  adj.postChargeback.mockClear()
  adj.postDeposit.mockClear()
  stripeEvent.current = null
  process.env.STRIPE_SECRET_KEY = 'sk_test_x'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_x'
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('charge.refunded → postRefundToLedger wiring', () => {
  it('posts ONE ledger entry per Stripe refund, keyed by that refund id + its own amount', async () => {
    // Two partial refunds on one charge. Each must post under its OWN refund id
    // (the idempotency key) and its OWN amount — never the charge id or the
    // charge-level amount_refunded, which would double-count / mis-key.
    stripeEvent.current = {
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_1',
          payment_intent: 'pi_1',
          amount_refunded: 5000,
          refunds: { data: [ { id: 're_1', amount: 3000 }, { id: 're_2', amount: 2000 } ] },
        },
      },
    }
    const res = await post()
    expect(res.status).toBe(200)
    expect(adj.postRefund).toHaveBeenCalledTimes(2)
    expect(adj.postRefund).toHaveBeenNthCalledWith(1, {
      tenantId: TENANT, sourceId: 're_1', amountCents: 3000, memo: `Refund · booking ${BOOKING.slice(0, 8)}`,
    })
    expect(adj.postRefund).toHaveBeenNthCalledWith(2, {
      tenantId: TENANT, sourceId: 're_2', amountCents: 2000, memo: `Refund · booking ${BOOKING.slice(0, 8)}`,
    })
  })

  it('falls back to charge id + amount_refunded when the refunds list is empty', async () => {
    // Stripe did not expand the refunds array on the event; the handler must
    // still record the money-out using the charge id as the idempotency key.
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_2', payment_intent: 'pi_1', amount_refunded: 1500, refunds: { data: [] } } },
    }
    await post()
    expect(adj.postRefund).toHaveBeenCalledTimes(1)
    expect(adj.postRefund).toHaveBeenCalledWith({
      tenantId: TENANT, sourceId: 'ch_2', amountCents: 1500, memo: `Refund · booking ${BOOKING.slice(0, 8)}`,
    })
  })

  it('uses a bare "Refund" memo when the resolved payment has no booking', async () => {
    adj.resolved = { tenantId: TENANT, bookingId: null }
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_3', payment_intent: 'pi_1', amount_refunded: 900, refunds: { data: [] } } },
    }
    await post()
    expect(adj.postRefund).toHaveBeenCalledWith({ tenantId: TENANT, sourceId: 'ch_3', amountCents: 900, memo: 'Refund' })
  })

  it('posts NOTHING when the payment intent resolves to no tenant', async () => {
    // No matching payment row → we do not know whose books to reverse. Dropping
    // the post is correct; posting to a guessed tenant would corrupt their ledger.
    adj.resolved = null
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_4', payment_intent: 'pi_unknown', amount_refunded: 4000, refunds: { data: [] } } },
    }
    const res = await post()
    expect(res.status).toBe(200)
    expect(adj.postRefund).not.toHaveBeenCalled()
  })

  it('posts NOTHING when the charge carries no payment_intent to resolve from', async () => {
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_5', payment_intent: null, amount_refunded: 4000, refunds: { data: [{ id: 're_x', amount: 4000 }] } } },
    }
    await post()
    expect(adj.postRefund).not.toHaveBeenCalled()
  })
})

describe('charge.refunded → payments/bookings status sync', () => {
  // Before this fix, only the ledger moved on refund -- payments.status and
  // bookings.payment_status stayed 'succeeded'/'paid' forever for any refund
  // NOT issued through Selena's own process_stripe_refund tool. These pin the
  // sync the webhook now does directly, keyed off the same resolved payment.
  it('marks the payment + booking "refunded" on a full refund', async () => {
    h.store.payments = [{ id: 'pay_1', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 5000, status: 'completed' }]
    h.store.bookings = [{ id: BOOKING, tenant_id: TENANT, payment_status: 'paid' }]
    adj.resolved = { tenantId: TENANT, bookingId: BOOKING, paymentId: 'pay_1', amountCents: 5000, status: 'completed' }
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_10', payment_intent: 'pi_1', amount_refunded: 5000, refunds: { data: [] } } },
    }
    await post()
    expect(h.store.payments[0].status).toBe('refunded')
    expect(h.store.bookings[0].payment_status).toBe('refunded')
  })

  it('marks the payment + booking "partially_refunded" when amount_refunded is less than the original payment', async () => {
    h.store.payments = [{ id: 'pay_2', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 10000, status: 'completed' }]
    h.store.bookings = [{ id: BOOKING, tenant_id: TENANT, payment_status: 'paid' }]
    adj.resolved = { tenantId: TENANT, bookingId: BOOKING, paymentId: 'pay_2', amountCents: 10000, status: 'completed' }
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_11', payment_intent: 'pi_1', amount_refunded: 3000, refunds: { data: [] } } },
    }
    await post()
    expect(h.store.payments[0].status).toBe('partially_refunded')
    expect(h.store.bookings[0].payment_status).toBe('partially_refunded')
  })

  it('syncs the payment even with no linked booking (invoice-only payment)', async () => {
    h.store.payments = [{ id: 'pay_3', tenant_id: TENANT, booking_id: null, invoice_id: 'inv_1', amount_cents: 2000, status: 'succeeded' }]
    adj.resolved = { tenantId: TENANT, bookingId: null, paymentId: 'pay_3', amountCents: 2000, status: 'succeeded' }
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_12', payment_intent: 'pi_2', amount_refunded: 2000, refunds: { data: [] } } },
    }
    await post()
    expect(h.store.payments[0].status).toBe('refunded')
    expect(h.store.bookings ?? []).toHaveLength(0)
  })

  it('does not re-sync a payment already fully refunded (stale/out-of-order redelivery guard)', async () => {
    h.store.payments = [{ id: 'pay_4', tenant_id: TENANT, booking_id: BOOKING, amount_cents: 5000, status: 'refunded' }]
    h.store.bookings = [{ id: BOOKING, tenant_id: TENANT, payment_status: 'refunded' }]
    // Stale redelivery of an EARLIER, smaller amount_refunded than what already landed.
    adj.resolved = { tenantId: TENANT, bookingId: BOOKING, paymentId: 'pay_4', amountCents: 5000, status: 'refunded' }
    stripeEvent.current = {
      type: 'charge.refunded',
      data: { object: { id: 'ch_13', payment_intent: 'pi_1', amount_refunded: 2000, refunds: { data: [] } } },
    }
    await post()
    // Would have wrongly downgraded to 'partially_refunded' without the guard.
    expect(h.store.payments[0].status).toBe('refunded')
    expect(h.store.bookings[0].payment_status).toBe('refunded')
  })
})

describe('charge.dispute.created → postChargebackToLedger wiring', () => {
  it('records the chargeback keyed by dispute id + amount and opens a high-priority task', async () => {
    stripeEvent.current = {
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_1', payment_intent: 'pi_1', amount: 4200 } },
    }
    const res = await post()
    expect(res.status).toBe(200)
    expect(adj.postChargeback).toHaveBeenCalledTimes(1)
    expect(adj.postChargeback).toHaveBeenCalledWith({
      tenantId: TENANT, sourceId: 'dp_1', amountCents: 4200, memo: 'Chargeback / dispute',
    })
    // The owner must be told to respond in Stripe before the deadline.
    expect(h.store.admin_tasks).toHaveLength(1)
    expect(h.store.admin_tasks[0]).toMatchObject({
      tenant_id: TENANT, type: 'chargeback', priority: 'high', related_type: 'booking', related_id: BOOKING,
    })
  })

  it('posts NO chargeback and opens NO task when the tenant is unresolved', async () => {
    adj.resolved = null
    stripeEvent.current = {
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_2', payment_intent: 'pi_unknown', amount: 4200 } },
    }
    await post()
    expect(adj.postChargeback).not.toHaveBeenCalled()
    expect(h.store.admin_tasks).toHaveLength(0)
  })
})
