import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/invoices/:id/remove-booking — P1/W1 queue item: consolidated
 * monthly invoices had no way to view/edit which bookings were on a draft
 * before it's sent. This route drops one visit's line item from a draft
 * recurring-consolidation invoice, recomputes totals, and frees the
 * underlying booking (invoice_id -> null) so it's billable again next cycle
 * instead of being stuck "invoiced" against a statement that no longer lists it.
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

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: (...a: unknown[]) => h.requirePermission(...a),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

function seedInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inv-A1',
    tenant_id: 'tenant-A',
    recurring_schedule_id: 'sched-A1',
    status: 'draft',
    tax_rate_bps: 0,
    discount_cents: 0,
    line_items: [
      { id: 'li_book-1', name: 'Cleaning', description: 'Jun 5, 2026', quantity: 1, unit_price_cents: 10000, subtotal_cents: 10000 },
      { id: 'li_book-2', name: 'Cleaning', description: 'Jun 12, 2026', quantity: 1, unit_price_cents: 12000, subtotal_cents: 12000 },
    ],
    subtotal_cents: 22000,
    tax_cents: 0,
    total_cents: 22000,
    ...overrides,
  }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = {
    invoices: [seedInvoice(), seedInvoice({ id: 'inv-B1', tenant_id: 'tenant-B', recurring_schedule_id: 'sched-B1' })],
    bookings: [
      { id: 'book-1', tenant_id: 'tenant-A', invoice_id: 'inv-A1' },
      { id: 'book-2', tenant_id: 'tenant-A', invoice_id: 'inv-A1' },
    ],
    invoice_activity: [],
  }
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
})

describe('POST /api/invoices/:id/remove-booking', () => {
  it('drops the line item, recomputes totals, and frees the booking', async () => {
    const res = await POST(postReq({ booking_id: 'book-1' }), params('inv-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect((json.invoice.line_items as Array<{ id: string }>).map((li) => li.id)).toEqual(['li_book-2'])
    expect(json.invoice.subtotal_cents).toBe(12000)
    expect(json.invoice.total_cents).toBe(12000)
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBeNull()
    // the other visit stays claimed by this invoice
    expect(h.store.bookings.find((b) => b.id === 'book-2')?.invoice_id).toBe('inv-A1')
  })

  it('logs a booking_removed activity event', async () => {
    await POST(postReq({ booking_id: 'book-1' }), params('inv-A1'))
    expect(h.store.invoice_activity).toContainEqual(
      expect.objectContaining({ invoice_id: 'inv-A1', tenant_id: 'tenant-A', event_type: 'booking_removed' }),
    )
  })

  it('rejects a booking that is not on this invoice', async () => {
    const res = await POST(postReq({ booking_id: 'book-not-here' }), params('inv-A1'))
    expect(res.status).toBe(400)
    // invoice untouched
    expect(h.store.invoices.find((i) => i.id === 'inv-A1')?.line_items).toHaveLength(2)
  })

  it('rejects editing a non-draft invoice', async () => {
    h.store.invoices[0].status = 'sent'
    const res = await POST(postReq({ booking_id: 'book-1' }), params('inv-A1'))
    expect(res.status).toBe(400)
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBe('inv-A1')
  })

  it('rejects a standalone (non-consolidated) invoice', async () => {
    h.store.invoices[0].recurring_schedule_id = null
    const res = await POST(postReq({ booking_id: 'book-1' }), params('inv-A1'))
    expect(res.status).toBe(400)
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBe('inv-A1')
  })

  it("never touches another tenant's invoice", async () => {
    const res = await POST(postReq({ booking_id: 'book-1' }), params('inv-B1'))
    // tenant-A's session can't see tenant-B's invoice at all
    expect(res.status).toBe(404)
    expect(h.store.invoices.find((i) => i.id === 'inv-B1')?.line_items).toHaveLength(2)
  })
})
