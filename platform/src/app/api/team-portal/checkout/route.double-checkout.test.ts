import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/team-portal/checkout — double-checkout guard. Without it, check_in_time
 * is never cleared on the booking, so a repeat call against an already-checked-
 * out booking recomputes hoursWorked from the SAME check-in to a LATER "now",
 * inflating team_member_pay (read directly by finance/payroll-prep for gross
 * pay) and the client's price every time. Mirrors the existing check_in_time
 * guard on ../checkin/route.ts.
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

beforeEach(() => {
  h.booking = {
    id: 'bk-1',
    check_in_time: '2026-07-14T10:00:00.000Z',
    check_out_time: null,
    hourly_rate: 69,
    pay_rate: 25,
    team_size: 1,
    max_hours: null,
    price: 10000,
    service_type_id: null,
    team_member_id: 'tm-1',
    referrer_id: null,
    client_id: 'client-1',
    clients: { name: 'Jane', address: '123 Main St' },
    team_members: { pay_rate: 25 },
  }
  h.updateSpy.mockClear()
})

describe('POST /api/team-portal/checkout — double-checkout guard', () => {
  it('rejects a second checkout on an already-checked-out booking (403->400, no re-compute)', async () => {
    h.booking!.check_out_time = '2026-07-14T14:00:00.000Z'
    const res = await POST(postReq({ booking_id: 'bk-1' }))
    expect(res.status).toBe(400)
    expect(h.updateSpy).not.toHaveBeenCalled()
  })

  it('allows the first checkout on a booking with no check_out_time yet', async () => {
    const res = await POST(postReq({ booking_id: 'bk-1' }))
    expect(res.status).toBe(200)
    expect(h.updateSpy).toHaveBeenCalledTimes(1)
  })
})
