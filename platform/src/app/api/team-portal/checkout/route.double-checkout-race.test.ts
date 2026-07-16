import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/team-portal/checkout checked `booking.status !== 'in_progress'`
 * and `booking.check_out_time` against a plain SELECT snapshot, then flipped
 * the booking to 'completed' with an UNCONDITIONAL update (no WHERE on the
 * prior status). A field cleaner double-tapping "Check Out" on a spotty
 * connection (or a client-side retry after a timeout) fires two
 * near-simultaneous requests that both read 'in_progress'/null before either
 * write lands and both fall through: both push a "Cleaning complete!"
 * notification to the client, and the booking row ends up with whichever
 * call's actual_hours/pay/price happened to land last (lost update) instead
 * of the true first checkout. Fixed by claiming the in_progress -> completed
 * transition atomically (`eq('status','in_progress')` in the WHERE) — only
 * the winner proceeds to notify; the loser gets a clean 409.
 */

let verifyResult: { id: string; tid: string; role: string } | null
let bookingStatus: string
let bookingCheckOutTime: string | null

const { sendPushToClient } = vi.hoisted(() => ({ sendPushToClient: vi.fn(async () => {}) }))
vi.mock('@/lib/push', () => ({ sendPushToClient }))
vi.mock('@/lib/payment-processor', () => ({ processPayment: vi.fn(async () => null) }))
vi.mock('@/lib/nycmaid/admin-contacts', () => ({ smsAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => true, NYCMAID_TENANT_ID: 't-1' }))
vi.mock('../auth/token', () => ({ verifyToken: () => verifyResult }))

const baseBooking = {
  id: 'b-1',
  tenant_id: 't-1',
  status: 'in_progress',
  team_member_id: 'm-1',
  check_in_time: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  check_out_time: null as string | null,
  hourly_rate: 69,
  pay_rate: 25,
  team_size: 1,
  max_hours: null,
  price: 0,
  service_type_id: null,
  referrer_id: null,
  client_id: 'c-1',
  payment_status: 'unpaid',
  notes: null,
  clients: { name: 'Al', address: null },
  team_members: { pay_rate: 25 },
}

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table === 'bookings') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({
                data: { ...baseBooking, status: bookingStatus, check_out_time: bookingCheckOutTime },
              }),
            }),
          }),
        }),
        update: (payload: Record<string, unknown>) => {
          const eqs: Record<string, unknown> = {}
          const chain = {
            eq: (col: string, val: unknown) => {
              eqs[col] = val
              return chain
            },
            select: () => ({
              maybeSingle: async () => {
                const matches = baseBooking.id === eqs.id
                  && (eqs.tenant_id === undefined || baseBooking.tenant_id === eqs.tenant_id)
                  && (eqs.status === undefined || bookingStatus === eqs.status)
                if (!matches) return { data: null, error: null }
                bookingStatus = (payload.status as string) || bookingStatus
                bookingCheckOutTime = (payload.check_out_time as string) ?? bookingCheckOutTime
                return { data: { ...baseBooking, ...payload }, error: null }
              },
              // Only reachable by the pre-fix code path (`.select().single()`,
              // no status WHERE) — kept so mutation-testing the revert shows
              // the real double-fire behavior instead of a mock TypeError.
              single: async () => {
                bookingStatus = (payload.status as string) || bookingStatus
                bookingCheckOutTime = (payload.check_out_time as string) ?? bookingCheckOutTime
                return { data: { ...baseBooking, ...payload }, error: null }
              },
            }),
          }
          return chain
        },
      }
    }
    if (table === 'referrers' || table === 'notifications' || table === 'referral_commissions') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
        insert: async () => ({ error: null }),
      }
    }
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req() {
  return new Request('http://localhost/api/team-portal/checkout', {
    method: 'POST',
    headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: 'b-1' }),
  })
}

describe('POST /api/team-portal/checkout — double-checkout race', () => {
  beforeEach(() => {
    verifyResult = { id: 'm-1', tid: 't-1', role: 'worker' }
    bookingStatus = 'in_progress'
    bookingCheckOutTime = null
    sendPushToClient.mockClear()
  })

  it('checks out and flips the booking to completed', async () => {
    const res = await POST(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(bookingStatus).toBe('completed')
    expect(sendPushToClient).toHaveBeenCalledTimes(1)
    expect(json.booking.status).toBe('completed')
  })

  it('rejects a second, fully-sequential checkout once the booking is already completed', async () => {
    // Not a race — the first call completes entirely (status is 'completed'
    // in the store) before the second call even starts, so the pre-existing
    // status snapshot check catches it before the atomic claim is ever
    // reached. Confirms the claim doesn't regress this ordinary path.
    const res1 = await POST(req())
    expect(res1.status).toBe(200)
    const res2 = await POST(req())
    const json2 = await res2.json()
    expect(res2.status).toBe(400)
    expect(json2.error).toMatch(/booking is completed/i)
    expect(sendPushToClient).toHaveBeenCalledTimes(1)
  })

  it('does not double-notify the client when two checkouts race for the same booking', async () => {
    const [r1, r2] = await Promise.all([POST(req()), POST(req())])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(sendPushToClient).toHaveBeenCalledTimes(1)
    expect(bookingStatus).toBe('completed')
  })
})
