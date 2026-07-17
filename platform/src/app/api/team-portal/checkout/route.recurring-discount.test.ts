import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/team-portal/checkout — recurring-service discount must survive to the
 * actual charge. applyRecurringDiscount() is applied to `price` at booking
 * creation (client/book, portal/bookings — 20% weekly / 10% biweekly-monthly,
 * see lib/nycmaid/recurring-discount.ts), but this route's hourly-pricing
 * branch recomputed price from scratch (billableHours × raw hourly_rate ×
 * team_size) with no discount factor, silently overwriting the discounted
 * price with the full undiscounted one the instant the cleaner checked out —
 * the client's real Stripe/cash charge (processPayment's amountCents reads
 * this same updatedPriceCents) never reflected the discount they were quoted.
 */

const h = vi.hoisted(() => ({
  booking: null as Record<string, unknown> | null,
  updateSpy: vi.fn(),
}))

vi.mock('../auth/token', () => ({
  verifyToken: () => ({ id: 'tm-1', tid: 'tenant-A', role: 'worker' }),
}))

vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn(() => Promise.resolve(null)) }))
vi.mock('@/lib/push', () => ({ sendPushToClient: vi.fn(() => Promise.resolve()) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(() => Promise.resolve()) }))

vi.mock('@/lib/supabase', () => {
  const admin = {
    from: (table: string) => {
      if (table !== 'bookings') throw new Error(`unexpected table in this test: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: h.booking, error: null }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          h.updateSpy(payload)
          return {
            eq: () => ({
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: async () => ({ data: { ...h.booking, ...payload }, error: null }),
                  }),
                }),
              }),
            }),
          }
        },
      }
    },
  }
  return { supabaseAdmin: admin, supabase: admin }
})

import { POST } from './route'

const postReq = (body: unknown) =>
  new Request('http://x', {
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: JSON.stringify(body),
  })

// 3-hour job, $100/hr, team_size 1 → full price would be $300 (30000 cents).
beforeEach(() => {
  h.booking = {
    id: 'bk-1',
    check_in_time: '2026-07-14T10:00:00.000Z',
    check_out_time: null,
    hourly_rate: 100,
    pay_rate: 25,
    team_size: 1,
    max_hours: null,
    price: 10000, // stale pre-checkout estimate, must not leak through
    service_type_id: null, // hourly pricing model (default)
    recurring_type: null,
    team_member_id: 'tm-1',
    referrer_id: null,
    client_id: 'client-1',
    clients: { name: 'Jane', address: '123 Main St' },
    team_members: { pay_rate: 25 },
  }
  h.updateSpy.mockClear()
})

// check in exactly 3h before "now" (computed per-call, not a fixed past date,
// so the elapsed time seen by the route is always ~180.0 minutes regardless
// of when the suite actually runs).
const CHECKOUT_REQ = { booking_id: 'bk-1' }
const checkInThreeHoursAgo = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString()

describe('POST /api/team-portal/checkout — recurring discount survives to charge', () => {
  it('applies 20% off for a weekly recurring booking', async () => {
    h.booking!.recurring_type = 'weekly'
    h.booking!.check_in_time = checkInThreeHoursAgo()
    const res = await POST(postReq(CHECKOUT_REQ))
    expect(res.status).toBe(200)
    const json = await res.json()
    // 3h * $100 * 1 = $300 full; 20% off -> $240
    expect(json.client_total).toBe(240)
    expect(h.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ price: 24000 }))
  })

  it('applies 10% off for a monthly recurring booking', async () => {
    h.booking!.recurring_type = 'monthly'
    h.booking!.check_in_time = checkInThreeHoursAgo()
    const res = await POST(postReq(CHECKOUT_REQ))
    const json = await res.json()
    expect(json.client_total).toBe(270)
    expect(h.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ price: 27000 }))
  })

  it('applies 10% off for a monthly_date recurring booking (the real enum value every schedule route actually persists)', async () => {
    h.booking!.recurring_type = 'monthly_date'
    h.booking!.check_in_time = checkInThreeHoursAgo()
    const res = await POST(postReq(CHECKOUT_REQ))
    const json = await res.json()
    expect(json.client_total).toBe(270)
    expect(h.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ price: 27000 }))
  })

  it('applies no discount for a one-time (non-recurring) booking', async () => {
    h.booking!.recurring_type = null
    h.booking!.check_in_time = checkInThreeHoursAgo()
    const res = await POST(postReq(CHECKOUT_REQ))
    const json = await res.json()
    expect(json.client_total).toBe(300)
    expect(h.updateSpy).toHaveBeenCalledWith(expect.objectContaining({ price: 30000 }))
  })
})
