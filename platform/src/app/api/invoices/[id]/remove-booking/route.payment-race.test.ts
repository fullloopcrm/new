/**
 * POST /api/invoices/:id/remove-booking — TOCTOU race with a concurrent
 * invoice send.
 *
 * The route's `invoice.status !== 'draft'` guard reads status once, then
 * unconditionally UPDATEs line_items/totals with no re-check in the UPDATE's
 * own WHERE clause. If the invoice is sent (POST .../send) between that read
 * and the write, the blind UPDATE still rewrites the sent invoice's
 * line_items/totals out from under whatever the client was just sent/is
 * looking at.
 *
 * FIX: the UPDATE's WHERE clause now re-asserts status='draft' against the
 * CURRENT DB row. If a concurrent send won the race, the UPDATE matches zero
 * rows and the route returns 409 instead of silently editing a sent invoice
 * (and it no longer frees the booking's invoice_id either).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

/** Set by a test to inject a concurrent write right after the route's own
 *  initial SELECT resolves — the exact TOCTOU gap this fix closes. */
const afterInitialRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

vi.mock('@/lib/supabase', () => {
  const raw = makeTenantDbFake(h)
  const fake = {
    from(table: string) {
      const chain = raw.from(table) as Record<string, unknown>
      if (table !== 'invoices') return chain
      const origSingle = chain.single as () => Promise<unknown>
      chain.single = () =>
        origSingle().then((res) => {
          afterInitialRead.fn?.()
          afterInitialRead.fn = null
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
    invoices: [seedInvoice()],
    bookings: [
      { id: 'book-1', tenant_id: 'tenant-A', invoice_id: 'inv-A1' },
      { id: 'book-2', tenant_id: 'tenant-A', invoice_id: 'inv-A1' },
    ],
    invoice_activity: [],
  }
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: h.tenantId }, error: null }))
  afterInitialRead.fn = null
})

describe('POST /api/invoices/:id/remove-booking — concurrent-send race', () => {
  it('refuses to edit once the invoice was sent concurrently, instead of overwriting it', async () => {
    // Simulate POST .../send landing in the exact window between this
    // route's own initial SELECT and its later UPDATE. tenant-db-fake hands
    // back a live reference from `.single()` (unlike the real PostgREST
    // client, which returns a detached JSON snapshot) -- replacing the store
    // entry with a new object, rather than mutating the existing one in
    // place, keeps the route's already-read `invoice` snapshot stale, same
    // as it would be against a real DB.
    afterInitialRead.fn = () => {
      h.store.invoices[0] = { ...h.store.invoices[0], status: 'sent' }
    }

    const res = await POST(postReq({ booking_id: 'book-1' }), params('inv-A1'))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/concurrently/i)
    // Line items must still reflect the sent version — not silently
    // overwritten.
    expect(h.store.invoices[0].line_items).toHaveLength(2)
    // The booking must still be claimed by this invoice — never freed on
    // the race path.
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBe('inv-A1')
  })

  it('still edits a genuinely still-draft invoice (no regression on the non-race path)', async () => {
    const res = await POST(postReq({ booking_id: 'book-1' }), params('inv-A1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invoice.line_items).toHaveLength(1)
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBeNull()
  })
})
