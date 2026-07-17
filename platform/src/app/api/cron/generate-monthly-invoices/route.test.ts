/**
 * GET /api/cron/generate-monthly-invoices — rolls up every completed,
 * not-yet-invoiced booking for schedules flagged invoice_consolidation
 * ='monthly' into one draft invoice per schedule (P1/W1 build: commercial/
 * office recurring accounts expect one statement, not a standalone invoice
 * per visit).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  // Set only by the race tests below: simulates a concurrent process (an
  // overlapping cron retry, or a standalone POST /api/invoices call) claiming
  // one or all of the target bookings in the real gap between this route's
  // own SELECT and its bookings.invoice_id UPDATE -- the FK from
  // bookings.invoice_id to invoices.id forces invoice-creation to happen
  // first, so that gap is real, not contrived.
  raceClaimBookingIds: [] as string[],
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, {
    afterInsert: (row, table) => {
      if (table !== 'invoices' || h.raceClaimBookingIds.length === 0) return
      for (const id of h.raceClaimBookingIds) {
        const b = h.store.bookings.find((x) => x.id === id)
        if (b) b.invoice_id = 'concurrent-invoice'
      }
    },
  })
  return { supabaseAdmin: fake, supabase: fake }
})

import { GET } from './route'

function req(): Request {
  return new Request('http://localhost/api/cron/generate-monthly-invoices', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  h.seq = 0
  h.raceClaimBookingIds = []
  h.store = {
    recurring_schedules: [
      { id: 'sched-monthly', tenant_id: 'tenant-A', client_id: 'client-A', invoice_consolidation: 'monthly' },
      { id: 'sched-per-visit', tenant_id: 'tenant-A', client_id: 'client-B', invoice_consolidation: 'per_visit' },
    ],
    bookings: [
      { id: 'book-1', schedule_id: 'sched-monthly', status: 'completed', invoice_id: null, price: 10000, service_type: 'Cleaning', start_time: '2026-06-05T09:00:00' },
      { id: 'book-2', schedule_id: 'sched-monthly', status: 'completed', invoice_id: null, price: 12000, service_type: 'Cleaning', start_time: '2026-06-12T09:00:00' },
      // already invoiced — must be excluded, not double-billed
      { id: 'book-already-invoiced', schedule_id: 'sched-monthly', status: 'completed', invoice_id: 'inv-existing', price: 9000, service_type: 'Cleaning', start_time: '2026-06-19T09:00:00' },
      // not completed yet — must be excluded
      { id: 'book-scheduled', schedule_id: 'sched-monthly', status: 'scheduled', invoice_id: null, price: 9000, service_type: 'Cleaning', start_time: '2026-06-26T09:00:00' },
      // belongs to a per_visit schedule — must never be swept into a rollup
      { id: 'book-per-visit', schedule_id: 'sched-per-visit', status: 'completed', invoice_id: null, price: 8000, service_type: 'Cleaning', start_time: '2026-06-05T09:00:00' },
    ],
    invoices: [],
    invoice_activity: [],
    entities: [{ id: 'ent-1', tenant_id: 'tenant-A', is_default: true }],
    notifications: [],
  }
})

describe('GET /api/cron/generate-monthly-invoices', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(401)
  })

  it('creates ONE invoice per monthly-consolidation schedule, one line item per unbilled completed visit', async () => {
    const res = await GET(req())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.invoices_created).toBe(1)
    expect(json.bookings_billed).toBe(2)

    const invoices = h.store.invoices.filter((i) => i.recurring_schedule_id === 'sched-monthly')
    expect(invoices).toHaveLength(1)
    const inv = invoices[0]
    expect(inv.client_id).toBe('client-A')
    expect(inv.status).toBe('draft')
    expect(inv.total_cents).toBe(22000)
    expect((inv.line_items as unknown[]).length).toBe(2)
  })

  it('marks the billed bookings with the new invoice_id so they cannot be double-billed next run', async () => {
    const res = await GET(req())
    const { invoice_id: _unused } = await res.json()
    const inv = h.store.invoices.find((i) => i.recurring_schedule_id === 'sched-monthly')!

    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBe(inv.id)
    expect(h.store.bookings.find((b) => b.id === 'book-2')?.invoice_id).toBe(inv.id)
  })

  it('never touches a booking already invoiced standalone', async () => {
    await GET(req())
    expect(h.store.bookings.find((b) => b.id === 'book-already-invoiced')?.invoice_id).toBe('inv-existing')
  })

  it('never bills a not-yet-completed booking', async () => {
    await GET(req())
    expect(h.store.bookings.find((b) => b.id === 'book-scheduled')?.invoice_id).toBeNull()
  })

  it('never sweeps a per_visit schedule\'s bookings into a rollup', async () => {
    const res = await GET(req())
    const json = await res.json()

    expect(json.bookings_billed).toBe(2) // sched-monthly only
    expect(h.store.bookings.find((b) => b.id === 'book-per-visit')?.invoice_id).toBeNull()
    expect(h.store.invoices.some((i) => i.client_id === 'client-B')).toBe(false)
  })

  it('excludes a completed booking with price:null from the rollup instead of billing it at $0, and leaves it unclaimed for a future run', async () => {
    // health-check's stale-in-progress auto-complete sets status:'completed'
    // without ever finalizing price (only team-portal/checkout does) --
    // billing that as a real $0 line item would silently under-bill a real
    // visit and, worse, permanently lock it out of billing via invoice_id.
    h.store.bookings.push({
      id: 'book-unpriced',
      schedule_id: 'sched-monthly',
      status: 'completed',
      invoice_id: null,
      price: null,
      service_type: 'Cleaning',
      start_time: '2026-06-20T09:00:00',
    })

    const res = await GET(req())
    const json = await res.json()

    expect(json.bookings_billed).toBe(2) // book-1 + book-2 only, not book-unpriced
    const inv = h.store.invoices.find((i) => i.recurring_schedule_id === 'sched-monthly')!
    expect((inv.line_items as unknown[]).length).toBe(2)
    // Left un-invoiced, not silently dropped -- picks up automatically once priced.
    expect(h.store.bookings.find((b) => b.id === 'book-unpriced')?.invoice_id).toBeNull()
    const skipNotif = h.store.notifications.find((n) => n.type === 'monthly_invoice_unpriced_bookings_skipped')
    expect(skipNotif?.message).toContain('book-unpriced')
  })

  it('is a no-op for a schedule with nothing left to bill', async () => {
    h.store.bookings = h.store.bookings.filter((b) => b.schedule_id !== 'sched-monthly' || b.status !== 'completed' || b.invoice_id)

    const res = await GET(req())
    const json = await res.json()

    expect(json.invoices_created).toBe(0)
    expect(json.bookings_billed).toBe(0)
  })

  it('rolls back the invoice instead of double-billing when a concurrent claim wins every targeted booking', async () => {
    // Simulates an overlapping cron retry (or a standalone POST /api/invoices
    // call) claiming both book-1 and book-2 in the gap between this route's
    // SELECT and its own UPDATE -- must not leave a ghost invoice with 2 line
    // items pointing at bookings that now belong to a different invoice.
    h.raceClaimBookingIds = ['book-1', 'book-2']

    const res = await GET(req())
    const json = await res.json()

    expect(json.invoices_created).toBe(0)
    expect(json.bookings_billed).toBe(0)
    expect(h.store.invoices.some((i) => i.recurring_schedule_id === 'sched-monthly')).toBe(false)
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBe('concurrent-invoice')
    expect(h.store.bookings.find((b) => b.id === 'book-2')?.invoice_id).toBe('concurrent-invoice')
  })

  it('recomputes totals to only the bookings actually won when a concurrent claim takes one of them', async () => {
    // book-1 gets claimed by a "concurrent" process the instant the invoice is
    // created; book-2 is still ours. The invoice must bill ONLY book-2 --
    // otherwise the client is double-billed for book-1 across two invoices.
    h.raceClaimBookingIds = ['book-1']

    const res = await GET(req())
    const json = await res.json()

    expect(json.invoices_created).toBe(1)
    expect(json.bookings_billed).toBe(1)

    const inv = h.store.invoices.find((i) => i.recurring_schedule_id === 'sched-monthly')!
    expect((inv.line_items as Array<{ id: string }>).map((li) => li.id)).toEqual(['li_book-2'])
    expect(inv.total_cents).toBe(12000)
    expect(inv.subtotal_cents).toBe(12000)

    // book-1 stays claimed by the concurrent process, not silently
    // overwritten back to this invoice.
    expect(h.store.bookings.find((b) => b.id === 'book-1')?.invoice_id).toBe('concurrent-invoice')
    expect(h.store.bookings.find((b) => b.id === 'book-2')?.invoice_id).toBe(inv.id)
  })
})
