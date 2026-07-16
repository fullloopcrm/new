/**
 * POST /api/finance/mark-paid — duplicate 'manual paid' payment row race.
 *
 * The "record a payment for this manual mark-paid" branch is check-then-insert
 * with no DB backstop: SELECT existing payments for the booking, and only
 * INSERT a new payments row if none exist yet. Two concurrent calls for the
 * SAME booking (a double-tapped "Mark Paid" button, or the finance dashboard
 * open in two tabs) both pass the SELECT before either INSERT commits,
 * landing two 'manual'/'completed' payments rows for one booking.
 *
 * postPaymentRevenue() is idempotent by booking id, so the ledger itself
 * doesn't double-post revenue — but finance/summary sums payments.amount_cents
 * directly (not through the ledger), so the duplicate row inflates the
 * tenant's reported "collected this month" figure.
 *
 * FIX: give the insert a deterministic reference_id
 * (`manual-mark-paid-${booking_id}`) so it's backed by migration
 * 065_unique_payments_reference.sql's existing partial unique index on
 * payments(tenant_id, booking_id, reference_id); the route now catches 23505
 * as an idempotent no-op instead of landing a second row. The shared
 * ledger-supabase-fake already simulates that same 23505 for a genuine
 * duplicate insert on `payments`, so this test drives the REAL route handler
 * rather than mocking the error at the call site.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-mp'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))
vi.mock('@/lib/finance/post-revenue', () => ({ postPaymentRevenue: vi.fn(() => Promise.resolve({ posted: true })) }))

import { POST } from './route'

function markPaidReq(bookingId: string) {
  return POST(new Request('http://t', { method: 'POST', body: JSON.stringify({ booking_id: bookingId, type: 'client' }) }))
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    bookings: [{ id: 'bk1', tenant_id: TENANT_ID, price: 10000, client_id: 'client-1' }],
    payments: [],
  }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('concurrent "Mark Paid" for the same booking', () => {
  it('lands exactly one payments row, not two', async () => {
    const [first, second] = await Promise.all([markPaidReq('bk1'), markPaidReq('bk1')])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].reference_id).toBe('manual-mark-paid-bk1')
  })

  it('a normal single call still records the payment (no regression on the non-race path)', async () => {
    const res = await markPaidReq('bk1')
    expect(res.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.payments[0].amount_cents).toBe(10000)
  })
})
