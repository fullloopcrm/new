/**
 * POST /api/invoices — cross-tenant FK injection on client_id/booking_id/
 * quote_id (same class as the already-fixed PATCH /api/invoices/[id] and
 * PATCH /api/quotes/[id] guards). The create route inserted these three FKs
 * straight from the request body with zero tenant-ownership check, so a
 * caller could attach a brand-new invoice to another tenant's client and
 * exfiltrate that client's name/email/phone/address via the clients() join
 * used by this route's own GET, GET /api/invoices/[id], finance/ar-aging,
 * and finance/reconcile-candidates.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
vi.mock('@/lib/entity', () => ({
  getDefaultEntityId: vi.fn(async () => null),
  entityIdFromUrl: () => null,
}))
vi.mock('@/lib/invoice', () => ({
  normalizeLineItems: (items: unknown) => items,
  computeTotals: () => ({ subtotal_cents: 0, tax_cents: 0, discount_cents: 0, total_cents: 0 }),
  generateInvoicePublicToken: () => 'tok_test',
  generateInvoiceNumber: vi.fn(async () => 'INV-0001'),
  logInvoiceEvent: vi.fn(async () => {}),
}))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    invoices: [],
    clients: [
      { id: 'client-A1', tenant_id: TENANT_A, name: 'Pat A' },
      { id: 'client-B1', tenant_id: TENANT_B, name: 'Pat B (secret)' },
    ],
    bookings: [
      { id: 'booking-A1', tenant_id: TENANT_A },
      { id: 'booking-B1', tenant_id: TENANT_B },
    ],
    quotes: [
      { id: 'quote-A1', tenant_id: TENANT_A },
      { id: 'quote-B1', tenant_id: TENANT_B },
    ],
  }
})

describe('POST /api/invoices — cross-tenant FK injection', () => {
  it("rejects a client_id belonging to another tenant and does not insert an invoice", async () => {
    const res = await POST(postReq({ client_id: 'client-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.invoices.length).toBe(0)
  })

  it("rejects a booking_id belonging to another tenant", async () => {
    const res = await POST(postReq({ booking_id: 'booking-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.invoices.length).toBe(0)
  })

  it("rejects a quote_id belonging to another tenant", async () => {
    const res = await POST(postReq({ quote_id: 'quote-B1' }))

    expect(res.status).toBe(400)
    expect(h.store.invoices.length).toBe(0)
  })

  it('creates the invoice when client_id/booking_id/quote_id genuinely belong to the caller tenant', async () => {
    const res = await POST(postReq({ client_id: 'client-A1', booking_id: 'booking-A1', quote_id: 'quote-A1' }))

    expect(res.status).toBe(200)
    expect(h.store.invoices.length).toBe(1)
    expect(h.store.invoices[0].client_id).toBe('client-A1')
  })

  it('creates the invoice with no FKs attached when none are supplied', async () => {
    const res = await POST(postReq({ title: 'Standalone' }))

    expect(res.status).toBe(200)
    expect(h.store.invoices.length).toBe(1)
    expect(h.store.invoices[0].client_id).toBe(null)
  })
})
