import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 cross-tenant money-leak probe — Stripe `charge.refunded` route boundary.
 *
 * Second angle to W2's webhook test. The property locked here is the one the
 * leader order names literally: a refund whose underlying payment is NOT owned
 * by a given tenant must write NOTHING to that (or any other) tenant's ledger.
 *
 * The refund handler in route.ts routes the ledger reversal to the tenant it
 * resolves via `tenantFromPaymentIntent(payment_intent)` — an authoritative DB
 * lookup on the payment row — NOT from anything on the event (metadata,
 * client_reference_id, etc). This test proves that at the ROUTE boundary:
 *
 *   1. A refund for a payment_intent owned by tenant-A posts the reversal to
 *      tenant-A ONLY, even when the event's charge.metadata.tenant_id claims a
 *      DIFFERENT tenant (tenant-B). Metadata cannot redirect the money.
 *   2. A refund whose payment_intent resolves to NO owner (unknown intent)
 *      writes NOTHING — postRefundToLedger is never called, so no unscoped or
 *      cross-tenant ledger row is ever produced.
 *
 * Scope caveat (honest): this exercises the route's tenant-routing + guard
 * logic with the ledger post mocked; the reversal MATH (DR 4000 / CR 1050,
 * balanced, amount) is locked separately by the lib-level happy-path test in
 * post-adjustments.refund.happy-path.test.ts.
 */

const h = vi.hoisted(() => {
  const calls = { refund: [] as Array<{ tenantId: string; sourceId: string; amountCents: number; memo?: string }> }
  const owners: Record<string, { tenantId: string; bookingId: string | null }> = {}
  return {
    calls,
    owners,
    setOwner: (pi: string, val: { tenantId: string; bookingId: string | null }) => { owners[pi] = val },
    reset: () => {
      calls.refund.length = 0
      for (const k of Object.keys(owners)) delete owners[k]
    },
    // Real production module exports the route imports — mock all so import resolves.
    postRefundToLedger: vi.fn(async (o: { tenantId: string; sourceId: string; amountCents: number; memo?: string }) => {
      calls.refund.push(o)
      return { posted: true, entryId: 'entry-mock' }
    }),
    tenantFromPaymentIntent: vi.fn(async (pi: string) => owners[pi] ?? null),
    postDepositToLedger: vi.fn(async () => ({ posted: true })),
    postChargebackToLedger: vi.fn(async () => ({ posted: true })),
  }
})

// Stripe SDK: constructEvent just returns the parsed body so tests hand-craft events.
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
}))

import { POST } from './route'

function refundEvent(opts: {
  paymentIntent: string
  refunds?: Array<{ id: string; amount: number }>
  amountRefunded?: number
  metadataTenantId?: string
}) {
  const charge: Record<string, unknown> = {
    id: 'ch_test',
    payment_intent: opts.paymentIntent,
    amount_refunded: opts.amountRefunded ?? 0,
    refunds: { data: opts.refunds ?? [] },
    metadata: opts.metadataTenantId ? { tenant_id: opts.metadataTenantId } : {},
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
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_dummy'
})

describe('POST /api/webhooks/stripe charge.refunded — refund cannot leak into a tenant that does not own the payment', () => {
  it('routes the reversal to the DB-resolved owner (tenant-A), NOT the tenant-B claimed in event metadata', async () => {
    h.setOwner('pi_A', { tenantId: 'tenant-A', bookingId: 'bk_A' })

    const res = await POST(
      refundEvent({ paymentIntent: 'pi_A', refunds: [{ id: 're_1', amount: 5000 }], metadataTenantId: 'tenant-B' }),
    )
    expect(res.status).toBe(200)

    // Exactly one reversal, and it is scoped to the true owner.
    expect(h.calls.refund).toHaveLength(1)
    expect(h.calls.refund[0]).toMatchObject({ tenantId: 'tenant-A', sourceId: 're_1', amountCents: 5000 })
    // Nothing ever routed to the metadata-claimed tenant.
    expect(h.calls.refund.every((c) => c.tenantId === 'tenant-A')).toBe(true)
    expect(h.calls.refund.some((c) => c.tenantId === 'tenant-B')).toBe(false)
  })

  it('writes NOTHING when the payment_intent is owned by no tenant (unknown intent → no ledger post at all)', async () => {
    // owners map is empty → tenantFromPaymentIntent resolves null.
    const res = await POST(
      refundEvent({ paymentIntent: 'pi_orphan', refunds: [{ id: 're_x', amount: 9999 }], metadataTenantId: 'tenant-B' }),
    )
    expect(res.status).toBe(200)

    // The literal lock: unowned refund produces zero ledger writes.
    expect(h.tenantFromPaymentIntent).toHaveBeenCalledWith('pi_orphan')
    expect(h.postRefundToLedger).not.toHaveBeenCalled()
    expect(h.calls.refund).toHaveLength(0)
  })

  it('posts each refund line to the owner tenant only, across multiple refunds on one charge', async () => {
    h.setOwner('pi_A', { tenantId: 'tenant-A', bookingId: null })

    const res = await POST(
      refundEvent({ paymentIntent: 'pi_A', refunds: [{ id: 're_1', amount: 4000 }, { id: 're_2', amount: 1000 }] }),
    )
    expect(res.status).toBe(200)

    expect(h.calls.refund).toHaveLength(2)
    expect(h.calls.refund.map((c) => c.tenantId)).toEqual(['tenant-A', 'tenant-A'])
    expect(h.calls.refund.map((c) => c.amountCents).sort((a, b) => a - b)).toEqual([1000, 4000])
  })
})
