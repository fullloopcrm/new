import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '@/lib/nycmaid/self-book-discount'

/**
 * Discount itemization (2026-07-25 fix). Two bugs, both real:
 *
 * 1. The self-booking line item hardcoded `cents: 1000` instead of deriving
 *    it from SELF_BOOKING_DISCOUNT_DOLLARS -- the exact drift class that
 *    constant exists to prevent (this file's own comment already noted it
 *    had been manually nudged from a stale $20 once before).
 * 2. The generic `[Promo: $X ... applied]` regex required literally
 *    "applied]" -- the real self-booking note ends "applies at billing]",
 *    so it never matched anything and was dead code. Fixed to match both
 *    endings, with an explicit skip for self-booking matches so fixing the
 *    regex doesn't make the self-booking discount get counted twice (once by
 *    the dedicated isSelfBooked check, once by the now-working regex).
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
})) as unknown as FakeStoreHandle & {
  requirePermission: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-supabase', () => ({ tenantClient: async () => makeTenantDbFake(h) }))
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))

import { GET } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })

function baseBooking(over: Record<string, unknown> = {}) {
  return {
    id: 'book-A1', tenant_id: 'tenant-A', status: 'completed', team_size: 1, hourly_rate: 100,
    actual_hours: 2, discount_percent: null, one_time_credit_cents: null, notes: null,
    ...over,
  }
}

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: 'tenant-A' }, error: null }))
  h.store = {
    bookings: [baseBooking()],
    booking_team_members: [],
    payments: [],
    team_member_payouts: [],
    sms_logs: [],
  }
})

describe('GET /api/admin/bookings/[id]/closeout-summary — discount itemization', () => {
  it('itemizes the self-booking discount at SELF_BOOKING_DISCOUNT_DOLLARS, not a stale hardcoded amount', async () => {
    h.store.bookings = [baseBooking({ notes: '[Promo: $999 self-booking discount applies at billing]' })]
    // Even if the note text itself carried a bogus dollar figure, the
    // dedicated self-booking line item must use the real constant, not
    // whatever number happens to be embedded in free-text notes.
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()
    const selfBook = json.bill.discounts.filter((d: { label: string }) => /self-book/i.test(d.label))
    expect(selfBook).toHaveLength(1)
    expect(selfBook[0].cents).toBe(SELF_BOOKING_DISCOUNT_DOLLARS * 100)
  })

  it('does NOT double-count the self-booking discount now that the generic regex actually matches "applies at billing"', async () => {
    h.store.bookings = [baseBooking({ notes: `[Promo: $${SELF_BOOKING_DISCOUNT_DOLLARS} self-booking discount applies at billing]` })]
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()
    const selfBookEntries = json.bill.discounts.filter((d: { label: string }) => /self-book/i.test(d.label))
    expect(selfBookEntries).toHaveLength(1)
  })

  it('a non-self-booking promo note (hypothetical future use, "applied]" ending) is still itemized by the generic regex', async () => {
    h.store.bookings = [baseBooking({ notes: '[Promo: $15 referral discount applied]' })]
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()
    expect(json.bill.discounts).toContainEqual({ label: 'referral', cents: 1500 })
  })

  it('no promo note → no self-booking or promo line items', async () => {
    h.store.bookings = [baseBooking({ notes: 'Booked by admin over the phone' })]
    const res = await GET(new Request('http://x'), params('book-A1'))
    const json = await res.json()
    expect(json.bill.discounts).toEqual([])
  })
})
