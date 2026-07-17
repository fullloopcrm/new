/**
 * MARK-PAID RACE — POST /api/finance/mark-paid (type: 'client')
 *
 * The route read whether a `payments` row already existed for the booking,
 * then inserted one + posted revenue — but only wrote `payment_status:'paid'`
 * on `bookings` at the end, with no compare-and-swap on the status it read.
 * `payments` has no unique constraint on (tenant_id, booking_id) (only
 * `stripe_session_id UNIQUE`, which is null for manual payments), so two
 * concurrent "mark paid" clicks (double-click, or two admin tabs) would both
 * pass the `existing` check and each insert their own payment row + post
 * their own revenue journal entry — double-recording money received. Fix:
 * claim the unpaid->paid transition on `bookings` atomically with
 * `.neq('payment_status', 'paid')` BEFORE the payment insert / revenue post,
 * mirroring the sibling bank-transactions match/categorize fixes.
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

function seedBooking(overrides: Partial<Row> = {}) {
  fake._seed('bookings', [
    {
      id: 'booking-1',
      tenant_id: TENANT_ID,
      price: 15000,
      client_id: 'client-1',
      payment_status: 'unpaid',
      team_member_paid: false,
      ...overrides,
    } as Row,
  ])
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('payments', [])
  vi.clearAllMocks()
})

describe('POST /api/finance/mark-paid — client double-mark-paid race', () => {
  it('two concurrent client-paid requests insert exactly one payment and post revenue once', async () => {
    seedBooking()
    const [a, b] = await Promise.all([
      POST(req({ booking_id: 'booking-1', type: 'client' })),
      POST(req({ booking_id: 'booking-1', type: 'client' })),
    ])
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)

    const payments = fake._store.get('payments') || []
    expect(payments.length).toBe(1)
    expect(payments[0].amount_cents).toBe(15000)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)

    const booking = (fake._store.get('bookings') || [])[0]
    expect(booking.payment_status).toBe('paid')
  })

  it('a sequential re-mark-paid after paid is a no-op, not a second payment', async () => {
    seedBooking()
    const first = await POST(req({ booking_id: 'booking-1', type: 'client' }))
    expect(first.status).toBe(200)

    const second = await POST(req({ booking_id: 'booking-1', type: 'client' }))
    expect(second.status).toBe(200)

    const payments = fake._store.get('payments') || []
    expect(payments.length).toBe(1)
    expect(postPaymentRevenue).toHaveBeenCalledTimes(1)
  })

  it('cleaner-paid type is unaffected — plain idempotent flag flip, no claim gate', async () => {
    seedBooking()
    const res = await POST(req({ booking_id: 'booking-1', type: 'cleaner' }))
    expect(res.status).toBe(200)

    const booking = (fake._store.get('bookings') || [])[0]
    expect(booking.team_member_paid).toBe(true)
    expect(postPaymentRevenue).not.toHaveBeenCalled()
  })
})
