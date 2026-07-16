import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/team-portal/checkin checked `booking.status` and
 * `booking.check_in_time` against a plain SELECT snapshot, then flipped the
 * booking to 'in_progress' with an UNCONDITIONAL update (no WHERE on the
 * prior status) — the same shape as the checkout double-checkout race fixed
 * alongside this. Two near-simultaneous calls (double-tap "Check In" on a
 * spotty connection, a client retry) both read the pre-check-in status/null
 * check_in_time and both fall through: whichever write lands last silently
 * wins the row (lost update on check_in_time/lat/lng), and since both calls
 * append to the same stale `notes` snapshot rather than each other's write, a
 * GPS-flag note from one of the two calls can be dropped entirely. Fixed by
 * claiming the scheduled/confirmed -> in_progress transition atomically
 * (`in('status', [...])` in the WHERE) — only the winner proceeds; the loser
 * gets a clean 409.
 */

const TENANT = 't-1'
const MEMBER_ID = 'm-1'
const BOOKING_ID = 'b-1'

type Row = Record<string, unknown>
let booking: Row

vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/geo', () => ({
  geocodeAddress: vi.fn(),
  calculateDistance: vi.fn(),
  CHECK_IN_MAX_MILES: 0.5,
  CHECK_IN_HARD_BLOCK_MILES: 2,
  CHECK_IN_GPS_ENABLED: false,
}))

vi.mock('@/lib/supabase', () => {
  const from = (table: string) => {
    if (table !== 'bookings') throw new Error(`unexpected table ${table}`)
    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: async () => ({ data: { ...booking } }),
          }),
          single: async () => ({ data: { ...booking } }),
        }),
      }),
      update: (payload: Row) => {
        const filters: Array<(r: Row) => boolean> = []
        const chain = {
          eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return chain },
          in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return chain },
          select: () => ({
            maybeSingle: async () => {
              const matches = filters.every((f) => f(booking))
              if (!matches) return { data: null, error: null }
              Object.assign(booking, payload)
              return { data: { ...booking }, error: null }
            },
            // Only reachable by the pre-fix code path (`.select().single()`,
            // no status WHERE) — kept so mutation-testing the revert shows
            // the real lost-update behavior instead of a mock TypeError.
            single: async () => {
              Object.assign(booking, payload)
              return { data: { ...booking }, error: null }
            },
          }),
        }
        return chain
      },
    }
  }
  return { supabaseAdmin: { from } }
})

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

function req() {
  const token = createToken(MEMBER_ID, TENANT, 0, 'worker')
  return new Request('http://localhost/api/team-portal/checkin', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ booking_id: BOOKING_ID }),
  })
}

describe('POST /api/team-portal/checkin — double-checkin race', () => {
  beforeEach(() => {
    booking = {
      id: BOOKING_ID,
      tenant_id: TENANT,
      status: 'confirmed',
      team_member_id: MEMBER_ID,
      start_time: '2020-01-01T09:00:00',
      check_in_time: null,
      notes: null,
      clients: { name: 'Al', address: null, latitude: null, longitude: null },
      client_properties: null,
    }
  })

  it('checks in and flips booking status to in_progress', async () => {
    const res = await POST(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.booking.status).toBe('in_progress')
    expect(booking.status).toBe('in_progress')
  })

  it('rejects a second, fully-sequential check-in once the booking is already in_progress', async () => {
    const res1 = await POST(req())
    expect(res1.status).toBe(200)
    const res2 = await POST(req())
    const json2 = await res2.json()
    expect(res2.status).toBe(400)
    expect(json2.error).toMatch(/booking is in_progress/i)
  })

  it('does not lose the check-in write when two check-ins race for the same booking', async () => {
    const [r1, r2] = await Promise.all([POST(req()), POST(req())])
    const statuses = [r1.status, r2.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(booking.status).toBe('in_progress')
    expect(booking.check_in_time).not.toBeNull()
  })
})
