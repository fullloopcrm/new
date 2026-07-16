/**
 * POST /api/invoices from_booking_id — booking.invoice_id back-reference
 * (P1/W1 consolidated-invoicing build). Before this, nothing marked a
 * booking as "already invoiced": creating a standalone invoice from a
 * booking never wrote back to that booking, so the new monthly rollup
 * generator (cron/generate-monthly-invoices) would have had no way to skip a
 * visit someone had already billed standalone, double-billing the client.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
}))

vi.mock('@/lib/supabase', () => {
  const opts = { insertDefaults: { created_at: '2026-07-16T00:00:00.000Z' } }
  return { supabaseAdmin: makeSupabaseFake(h, opts), supabase: makeSupabaseFake(h, opts) }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { POST as createInvoice } from './route'

const TENANT = 'tenant-A'
const jsonReq = (body: unknown) =>
  new Request('http://acme.example.com/api/invoices', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  h.tenantId = TENANT
  h.seq = 0
  h.store = {
    invoices: [],
    invoice_activity: [],
    bookings: [
      {
        id: 'book-1',
        tenant_id: TENANT,
        status: 'completed',
        price: 15000,
        actual_hours: 2,
        notes: null,
        clients: { id: 'client-A', name: 'Jane Doe', email: 'jane@x.com', phone: null, address: null },
        service_types: { name: 'Deep Clean', default_hourly_rate: 75, pricing_model: 'hourly' },
      },
    ],
    clients: [{ id: 'client-A', tenant_id: TENANT, name: 'Jane Doe' }],
    entities: [{ id: 'ent-1', tenant_id: TENANT, name: 'Acme Co', is_default: true }],
  }
})

describe('POST /api/invoices from_booking_id', () => {
  it('sets the source booking.invoice_id to the newly created invoice', async () => {
    const res = await createInvoice(jsonReq({ from_booking_id: 'book-1' }))
    expect(res.status).toBe(200)
    const { invoice } = await res.json()

    const booking = h.store.bookings.find((b) => b.id === 'book-1')
    expect(booking?.invoice_id).toBe(invoice.id)
  })

  it('never sets invoice_id on a standalone invoice with no booking reference', async () => {
    const res = await createInvoice(
      jsonReq({ line_items: [{ id: 'li1', name: 'Standalone', quantity: 1, unit_price_cents: 5000 }] }),
    )
    expect(res.status).toBe(200)

    const booking = h.store.bookings.find((b) => b.id === 'book-1')
    expect(booking?.invoice_id).toBeUndefined()
  })
})
