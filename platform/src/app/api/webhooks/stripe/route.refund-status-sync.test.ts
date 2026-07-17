import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 depth pass on the `charge.refunded` handler — the ledger reversal
 * (postRefundToLedger) was already locked by the cross-tenant-refund test,
 * but nothing previously verified the booking-status sync added alongside
 * it. Without this, a refund processed directly in the Stripe Dashboard (the
 * normal way, not through Selena chat) left `bookings.payment_status`
 * reading paid/partial forever even though the ledger correctly reversed
 * the sale -- so the dashboard/P&L/cash-flow/AR-aging kept counting it as
 * collected revenue with no way to ever correct it.
 *
 * Locks:
 *   - a FULL refund (cumulative amount_refunded >= charge.amount) flips the
 *     booking to payment_status='refunded',
 *   - a PARTIAL refund does NOT flip it (no agreed treatment yet -- left
 *     alone deliberately, not a missed case),
 *   - an invoice-only payment (no linked booking) triggers no booking write,
 *   - multiple partial refunds that cumulatively reach the full charge
 *     amount DO flip it (Stripe reports amount_refunded as cumulative).
 */

const h = vi.hoisted(() => {
  const calls = { refund: [] as Array<{ tenantId: string; sourceId: string; amountCents: number }>, sync: [] as Array<{ tenantId: string; bookingId: string }> }
  const owners: Record<string, { tenantId: string; bookingId: string | null }> = {}
  return {
    calls,
    owners,
    setOwner: (pi: string, val: { tenantId: string; bookingId: string | null }) => { owners[pi] = val },
    reset: () => {
      calls.refund.length = 0
      calls.sync.length = 0
      for (const k of Object.keys(owners)) delete owners[k]
    },
    postRefundToLedger: vi.fn(async (o: { tenantId: string; sourceId: string; amountCents: number }) => {
      calls.refund.push(o)
      return { posted: true, entryId: 'entry-mock' }
    }),
    tenantFromPaymentIntent: vi.fn(async (pi: string) => owners[pi] ?? null),
    postDepositToLedger: vi.fn(async () => ({ posted: true })),
    postChargebackToLedger: vi.fn(async () => ({ posted: true })),
    syncBookingRefundStatus: vi.fn(async (o: { tenantId: string; bookingId: string }) => {
      calls.sync.push(o)
    }),
  }
})

vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: (body: string) => JSON.parse(body) }
  }
  return { default: MockStripe }
})

vi.mock('@/lib/finance/post-adjustments', () => ({
  postRefundToLedger: h.postRefundToLedger,
  tenantFromPaymentIntent: h.tenantFromPaymentIntent,
  postDepositToLedger: h.postDepositToLedger,
  postChargebackToLedger: h.postChargebackToLedger,
  syncBookingRefundStatus: h.syncBookingRefundStatus,
}))

import { POST } from './route'

function refundEvent(opts: {
  paymentIntent: string
  chargeAmount?: number
  amountRefunded?: number
  refunds?: Array<{ id: string; amount: number }>
}) {
  const charge: Record<string, unknown> = {
    id: 'ch_test',
    payment_intent: opts.paymentIntent,
    amount: opts.chargeAmount,
    amount_refunded: opts.amountRefunded ?? 0,
    refunds: { data: opts.refunds ?? [] },
    metadata: {},
  }
  return new Request('https://app.fullloop.example/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify({ type: 'charge.refunded', data: { object: charge } }),
  })
}

beforeEach(() => {
  h.reset()
  h.postRefundToLedger.mockClear()
  h.tenantFromPaymentIntent.mockClear()
  h.syncBookingRefundStatus.mockClear()
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe charge.refunded — booking payment_status sync', () => {
  it('flips the booking to refunded on a FULL refund', async () => {
    h.setOwner('pi_full', { tenantId: 'tenant-A', bookingId: 'bk_full' })

    const res = await POST(refundEvent({ paymentIntent: 'pi_full', chargeAmount: 20000, amountRefunded: 20000, refunds: [{ id: 're_1', amount: 20000 }] }))
    expect(res.status).toBe(200)

    expect(h.calls.sync).toHaveLength(1)
    expect(h.calls.sync[0]).toEqual({ tenantId: 'tenant-A', bookingId: 'bk_full' })
  })

  it('does NOT flip the booking on a PARTIAL refund', async () => {
    h.setOwner('pi_partial', { tenantId: 'tenant-A', bookingId: 'bk_partial' })

    const res = await POST(refundEvent({ paymentIntent: 'pi_partial', chargeAmount: 20000, amountRefunded: 5000, refunds: [{ id: 're_2', amount: 5000 }] }))
    expect(res.status).toBe(200)

    expect(h.calls.refund).toHaveLength(1)
    expect(h.calls.sync).toHaveLength(0)
  })

  it('does not attempt a booking write when the payment has no linked booking (invoice-only)', async () => {
    h.setOwner('pi_invoice', { tenantId: 'tenant-A', bookingId: null })

    const res = await POST(refundEvent({ paymentIntent: 'pi_invoice', chargeAmount: 10000, amountRefunded: 10000, refunds: [{ id: 're_3', amount: 10000 }] }))
    expect(res.status).toBe(200)

    expect(h.calls.sync).toHaveLength(0)
  })

  it('flips the booking once cumulative partial refunds reach the full charge amount', async () => {
    h.setOwner('pi_cumulative', { tenantId: 'tenant-A', bookingId: 'bk_cumulative' })

    // Stripe's amount_refunded on the charge object is cumulative across all
    // refunds issued against it, not just the latest one.
    const res = await POST(refundEvent({ paymentIntent: 'pi_cumulative', chargeAmount: 20000, amountRefunded: 20000, refunds: [{ id: 're_4', amount: 12000 }, { id: 're_5', amount: 8000 }] }))
    expect(res.status).toBe(200)

    expect(h.calls.sync).toHaveLength(1)
    expect(h.calls.sync[0]).toEqual({ tenantId: 'tenant-A', bookingId: 'bk_cumulative' })
  })

  it('does not crash and skips the sync when charge.amount is missing from the event payload', async () => {
    h.setOwner('pi_noamount', { tenantId: 'tenant-A', bookingId: 'bk_noamount' })

    const res = await POST(refundEvent({ paymentIntent: 'pi_noamount', amountRefunded: 5000, refunds: [{ id: 're_6', amount: 5000 }] }))
    expect(res.status).toBe(200)

    expect(h.calls.sync).toHaveLength(0)
  })
})
