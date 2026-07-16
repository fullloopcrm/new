import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/invoices/:id/record-payment — first route-level regression test
 * (P1/W1 O13 sweep; flagged by W4 cross-lane audit as a real money-write path
 * with zero coverage). Manual Zelle/Venmo/cash/check recording is
 * tenantDb-scoped but has no unique-constraint backstop like the Stripe
 * webhook path, so the route itself is the only thing standing between a
 * crafted invoice id and a payment landing against the wrong tenant's books.
 *
 * The real DB trigger that recomputes invoices.amount_paid_cents/status when
 * a payment row lands is emulated here (same approach as
 * invoice-lifecycle.test.ts's applyPaymentTrigger) since tenant-db-fake has
 * no trigger support — this lets the paid-vs-partial branching and the
 * invoice_activity event_type the route chooses be exercised for real.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

function applyPaymentTrigger(payment: Record<string, unknown>) {
  const invId = payment.invoice_id
  if (!invId || (payment.status && payment.status !== 'succeeded')) return
  const inv = (h.store.invoices || []).find((r) => r.id === invId)
  if (!inv) return
  const paid = (Number(inv.amount_paid_cents) || 0) + (Number(payment.amount_cents) || 0)
  inv.amount_paid_cents = paid
  if (paid >= (Number(inv.total_cents) || 0)) {
    inv.status = 'paid'
    inv.paid_at = '2026-07-13T00:00:00.000Z'
  } else {
    inv.status = 'partial'
  }
}

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'payments') return chain
      const origSingle = chain.single as () => Promise<{ data: Record<string, unknown> | null; error: unknown }>
      chain.single = () =>
        origSingle().then((res) => {
          if (res.data) applyPaymentTrigger(res.data)
          return res
        })
      return chain
    },
  }
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { NextResponse } from 'next/server'
import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function seedInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inv-A1',
    tenant_id: 'tenant-A',
    client_id: 'client-A1',
    booking_id: 'book-A1',
    total_cents: 20000,
    amount_paid_cents: 0,
    status: 'sent',
    ...overrides,
  }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    invoices: [seedInvoice(), seedInvoice({ id: 'inv-B1', tenant_id: 'tenant-B' })],
    payments: [],
    invoice_activity: [],
  }
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
})

describe('POST /api/invoices/:id/record-payment — permission gate', () => {
  it('returns the permission error unchanged and never touches the DB', async () => {
    h.requirePermission.mockResolvedValueOnce({
      tenant: null,
      error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }),
    })

    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('inv-A1'))

    expect(res.status).toBe(403)
    expect(h.store.payments.length).toBe(0)
  })
})

describe('POST /api/invoices/:id/record-payment — input validation', () => {
  it('rejects a missing/zero amount with 400 before touching the DB', async () => {
    const res = await POST(postReq({ method: 'zelle' }), params('inv-A1'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Amount required' })
    expect(h.store.payments.length).toBe(0)
  })

  it('accepts a dollar amount and converts it to cents', async () => {
    const res = await POST(postReq({ amount: 50, method: 'cash' }), params('inv-A1'))

    expect(res.status).toBe(200)
    expect(h.store.payments[0].amount_cents).toBe(5000)
  })

  it('rejects an unrecognized payment method with 400 before touching the DB', async () => {
    const res = await POST(postReq({ amount_cents: 5000, method: 'bitcoin' }), params('inv-A1'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Invalid method: bitcoin' })
    expect(h.store.payments.length).toBe(0)
  })

  it('returns 404 for an invoice id that does not exist', async () => {
    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('does-not-exist'))

    expect(res.status).toBe(404)
    expect(h.store.payments.length).toBe(0)
  })

  it('rejects recording a payment on a void invoice', async () => {
    h.store.invoices.find((i) => i.id === 'inv-A1')!.status = 'void'

    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('inv-A1'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Cannot record payment on void invoice' })
    expect(h.store.payments.length).toBe(0)
  })

  it('rejects recording a payment on a refunded invoice', async () => {
    h.store.invoices.find((i) => i.id === 'inv-A1')!.status = 'refunded'

    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('inv-A1'))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'Cannot record payment on refunded invoice' })
  })
})

describe('POST /api/invoices/:id/record-payment — tenant isolation', () => {
  it("tenant A can never record a payment against tenant B's invoice", async () => {
    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('inv-B1'))

    expect(res.status).toBe(404)
    expect(h.store.payments.length).toBe(0)
    expect(h.store.invoice_activity.length).toBe(0)
  })

  it('a successful payment is stamped with the caller tenant_id via the tenantDb wrapper', async () => {
    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('inv-A1'))

    expect(res.status).toBe(200)
    expect(h.store.payments[0].tenant_id).toBe('tenant-A')
  })
})

describe('POST /api/invoices/:id/record-payment — payment recording', () => {
  it('records a partial payment, applies field defaults, and logs a partial_payment activity', async () => {
    const res = await POST(postReq({ amount_cents: 5000, method: 'zelle' }), params('inv-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    const payment = h.store.payments[0]
    expect(payment.invoice_id).toBe('inv-A1')
    expect(payment.booking_id).toBe('book-A1')
    expect(payment.client_id).toBe('client-A1')
    expect(payment.amount_cents).toBe(5000)
    expect(payment.tip_cents).toBe(0)
    expect(payment.status).toBe('succeeded')
    // Synthesized (not null) when the caller omits reference_id and the
    // invoice has a booking_id — see route.ts's layer-2 dedup comment and
    // route.race.test.ts. Deterministic prefix, time-bucket suffix varies.
    expect(payment.reference_id).toMatch(/^manual-record-payment-book-A1-5000-zelle-\d+$/)
    expect(payment.sender_name).toBeNull()
    expect(payment.received_at).toBeTruthy()

    expect(json).toEqual({
      ok: true,
      payment_id: payment.id,
      invoice_status: 'partial',
      amount_paid_cents: 5000,
      balance_cents: 15000,
    })

    expect(h.store.invoice_activity.length).toBe(1)
    expect(h.store.invoice_activity[0]).toMatchObject({
      invoice_id: 'inv-A1',
      tenant_id: 'tenant-A',
      event_type: 'partial_payment',
    })
  })

  it('records a full payment, flips the invoice to paid, and logs a paid activity', async () => {
    const res = await POST(
      postReq({ amount_cents: 20000, method: 'check', reference_id: 'chk-1001', sender_name: 'Alice' }),
      params('inv-A1')
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invoice_status).toBe('paid')
    expect(json.balance_cents).toBe(0)
    expect(json.amount_paid_cents).toBe(20000)

    const payment = h.store.payments[0]
    expect(payment.reference_id).toBe('chk-1001')
    expect(payment.sender_name).toBe('Alice')

    expect(h.store.invoice_activity[0]).toMatchObject({
      event_type: 'paid',
      detail: expect.objectContaining({ new_balance_cents: 0 }),
    })
  })

  it('carries tip_cents through to the inserted payment row', async () => {
    await POST(postReq({ amount_cents: 5000, tip_cents: 1000, method: 'venmo' }), params('inv-A1'))

    expect(h.store.payments[0].tip_cents).toBe(1000)
  })
})
