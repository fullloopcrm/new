/**
 * Item (138) fresh-ground — `invoices.status = 'refunded'` was fully declared
 * (CHECK constraint, STATUS_COLORS badge, invoice_activity's event_type union,
 * and DELETE /api/invoices/[id]'s own "refund first" error message) but no
 * code path anywhere ever wrote it. This route is the missing writer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const TENANT = 'tenant-1'
const INVOICE_ID = 'inv-1'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

const postRefundToLedger = vi.fn().mockResolvedValue({ posted: true, entryId: 'je-1' })
vi.mock('@/lib/finance/post-adjustments', () => ({ postRefundToLedger: (...args: unknown[]) => postRefundToLedger(...args) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from '@/app/api/invoices/[id]/refund/route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Record<string, unknown> = {}): Request {
  return new Request(`http://t.test/api/invoices/${INVOICE_ID}/refund`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const params = Promise.resolve({ id: INVOICE_ID })

describe('POST /api/invoices/[id]/refund', () => {
  beforeEach(() => {
    postRefundToLedger.mockClear()
    fake._store.clear()
    fake._seed('invoices', [
      { id: INVOICE_ID, tenant_id: TENANT, status: 'paid', amount_paid_cents: 20000, total_cents: 20000 },
    ])
    fake._seed('payments', [
      { id: 'pay-1', tenant_id: TENANT, invoice_id: INVOICE_ID, amount_cents: 20000, status: 'succeeded' },
    ])
  })

  it('flips the invoice to refunded, zeroes amount_paid_cents, and marks the funding payment refunded', async () => {
    const res = await POST(req({ reason: 'Client dispute avoided' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.refunded_cents).toBe(20000)

    const invoice = fake._all('invoices').find(r => r.id === INVOICE_ID)
    expect(invoice?.status).toBe('refunded')
    expect(invoice?.amount_paid_cents).toBe(0)

    const payment = fake._all('payments').find(r => r.id === 'pay-1')
    expect(payment?.status).toBe('refunded')
  })

  it('writes an invoice_activity row with event_type refunded — the literal write path that never existed', async () => {
    await POST(req({}), { params })
    const activity = fake._all('invoice_activity').find(r => r.invoice_id === INVOICE_ID)
    expect(activity?.event_type).toBe('refunded')
    expect((activity?.detail as Record<string, unknown>)?.amount_cents).toBe(20000)
  })

  it('posts the reversal to the ledger via postRefundToLedger', async () => {
    await POST(req({}), { params })
    expect(postRefundToLedger).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT, sourceId: INVOICE_ID, amountCents: 20000 }),
    )
  })

  it('rejects refunding an invoice with nothing paid', async () => {
    fake._store.set('invoices', [{ id: INVOICE_ID, tenant_id: TENANT, status: 'sent', amount_paid_cents: 0, total_cents: 20000 }])
    const res = await POST(req({}), { params })
    expect(res.status).toBe(400)
    expect(postRefundToLedger).not.toHaveBeenCalled()
  })

  it('rejects double-refunding an already-refunded invoice', async () => {
    fake._store.set('invoices', [{ id: INVOICE_ID, tenant_id: TENANT, status: 'refunded', amount_paid_cents: 0, total_cents: 20000 }])
    const res = await POST(req({}), { params })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/already/i)
  })

  it('rejects refunding a voided invoice', async () => {
    fake._store.set('invoices', [{ id: INVOICE_ID, tenant_id: TENANT, status: 'void', amount_paid_cents: 0, total_cents: 20000 }])
    const res = await POST(req({}), { params })
    expect(res.status).toBe(400)
  })

  it('404s for an unknown invoice id', async () => {
    fake._store.set('invoices', [])
    const res = await POST(req({}), { params })
    expect(res.status).toBe(404)
  })
})
