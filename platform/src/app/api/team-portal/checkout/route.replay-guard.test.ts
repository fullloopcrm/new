import { describe, it, expect, vi } from 'vitest'

/**
 * POST /api/team-portal/checkout recomputed and re-billed the checkout
 * amount with no check for an existing check_out_time, so a team member
 * could replay the checkout call to keep re-triggering pay/price
 * computation (and repeat SMS/notify sends) on a job already closed out.
 * Now rejects with 400 if check_out_time is already set, before any
 * pricing/payment logic runs.
 */

const TEAM_MEMBER = 'tm-1'
const TENANT = 'tenant-A'
const BOOKING = 'booking-1'

vi.mock('../auth/token', () => ({
  verifyToken: (_token: string) => ({ id: TEAM_MEMBER, tid: TENANT }),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => {
              if (table !== 'bookings') return { data: null, error: { message: 'unexpected table' } }
              return {
                data: {
                  id: BOOKING,
                  team_member_id: TEAM_MEMBER,
                  check_in_time: new Date(Date.now() - 5 * 60_000).toISOString(),
                  check_out_time: new Date().toISOString(),
                  hourly_rate: 50,
                  pay_rate: 20,
                  team_size: 1,
                  max_hours: null,
                  price: 100,
                  service_type_id: null,
                  referrer_id: null,
                  client_id: 'client-1',
                  clients: { name: 'Client', address: '123 St' },
                  team_members: { pay_rate: 20 },
                },
                error: null,
              }
            },
          }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('http://t.test/api/team-portal/checkout', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/team-portal/checkout — replay guard', () => {
  it('400s a booking that already has check_out_time (no pay/price re-inflation)', async () => {
    const res = await POST(req({ booking_id: BOOKING }))
    expect(res.status).toBe(400)
  })
})
