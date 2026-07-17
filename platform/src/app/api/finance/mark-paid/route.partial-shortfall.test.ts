/**
 * MARK-PAID PARTIAL SHORTFALL — POST /api/finance/mark-paid (type: 'client')
 *
 * Closing out a partial booking (a prior Zelle/cash payment already recorded
 * SOME money via payment-processor.ts) used to skip recording ANY new
 * payment at all the instant ANY existing payment row was found for the
 * booking -- so the remaining balance the client just paid in cash to close
 * it out never got its own payment row, and postPaymentRevenue() never ran
 * for it. The ledger silently stopped tracking the rest of that booking's
 * revenue forever. Fix: record a payment row for the SHORTFALL (price minus
 * what's already been recorded), not skip outright.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))

vi.mock('@/lib/finance/post-revenue', () => ({
  postPaymentRevenue: vi.fn(async () => ({ posted: true, entryId: 'entry-1' })),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { postPaymentRevenue } from '@/lib/finance/post-revenue'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Row): Request {
  return new Request('http://x/api/finance/mark-paid', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('payments', [])
  vi.clearAllMocks()
})

describe('POST /api/finance/mark-paid — closing out a partial booking records the shortfall, not nothing', () => {
  it('records a new payment row for exactly the remaining balance, not the full price again', async () => {
    fake._seed('bookings', [
      { id: 'booking-1', tenant_id: TENANT_ID, price: 20000, client_id: 'client-1', payment_status: 'partial', team_member_paid: false } as Row,
    ])
    // $50 already collected via a prior Zelle payment (payment-processor.ts).
    fake._seed('payments', [
      { id: 'pay-existing', tenant_id: TENANT_ID, booking_id: 'booking-1', amount_cents: 5000, status: 'partial' } as Row,
    ])

    const res = await POST(req({ booking_id: 'booking-1', type: 'client' }))
    expect(res.status).toBe(200)

    const payments = (fake._store.get('payments') || []).filter((p) => p.id !== 'pay-existing')
    expect(payments.length).toBe(1)
    // $200 total - $50 already collected = $150 shortfall, not $200 again.
    expect(payments[0].amount_cents).toBe(15000)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)

    const booking = (fake._store.get('bookings') || [])[0]
    expect(booking.payment_status).toBe('paid')
  })

  it('does not insert a zero/negative payment row when the existing payments already cover the price', async () => {
    fake._seed('bookings', [
      { id: 'booking-2', tenant_id: TENANT_ID, price: 20000, client_id: 'client-1', payment_status: 'partial', team_member_paid: false } as Row,
    ])
    // Already fully collected across two prior payments, still sitting at payment_status='partial'.
    fake._seed('payments', [
      { id: 'pay-a', tenant_id: TENANT_ID, booking_id: 'booking-2', amount_cents: 12000, status: 'partial' } as Row,
      { id: 'pay-b', tenant_id: TENANT_ID, booking_id: 'booking-2', amount_cents: 8000, status: 'partial' } as Row,
    ])

    const res = await POST(req({ booking_id: 'booking-2', type: 'client' }))
    expect(res.status).toBe(200)

    const payments = (fake._store.get('payments') || []).filter((p) => p.id !== 'pay-a' && p.id !== 'pay-b')
    expect(payments.length).toBe(0)
    expect(postPaymentRevenue).not.toHaveBeenCalled()
  })
})
