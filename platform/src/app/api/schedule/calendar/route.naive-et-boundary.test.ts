import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * GET /api/schedule/calendar mixed several "now" concepts that read the
 * SERVER's local calendar/clock (UTC on Vercel) while comparing against or
 * displaying naive-ET `bookings.start_time`:
 *  - `today_total`/`live_ops` bucketed bookings by the UTC calendar day of
 *    `now`, not the ET one -- wrong for ~4-5h every evening (same class as
 *    this session's other day-boundary fixes).
 *  - the in-progress "Xh in" duration subtracted a real instant (`now`)
 *    from the mis-parsed naive-ET `start_time` Date (~4-5h earlier than the
 *    true instant it represents), inflating every reading by the EST/EDT
 *    offset -- always wrong, not just during the evening window.
 *  - `first_upcoming` compared that same mis-parsed Date against real
 *    `now`, silently excluding the next ~4-5h of genuinely-upcoming jobs.
 *
 * Real time in these tests: 2026-01-06T00:30:00Z = 7:30pm EST Jan 5 -- UTC
 * has already rolled to Jan 6, ET has not.
 */
process.env.TZ = 'UTC'

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: (col: string, val: string) => { filters.push((r) => (r[col] as string) >= val); return c },
    lt: (col: string, val: string) => { filters.push((r) => (r[col] as string) < val); return c },
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: rows, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

const getReq = () => new (require('next/server').NextRequest)('http://x/api/schedule/calendar')

describe('GET /api/schedule/calendar — naive-ET vs UTC boundary bugs', () => {
  beforeEach(() => {
    currentRole.value = 'staff'
    DB.bookings = []
    DB.team_members = []
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-06T00:30:00.000Z')) // 7:30pm EST Jan 5
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts a booking earlier the same ET day in today_total, despite UTC already reading tomorrow', async () => {
    DB.bookings = [
      { id: 'b1', tenant_id: TENANT_A, team_member_id: null, price: 10000, start_time: '2026-01-05T15:00:00', end_time: '2026-01-05T17:00:00', status: 'scheduled', payment_status: 'unpaid', service_type: 'clean' },
    ]
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.stats.today_total).toBe(1)
  })

  it('reports real elapsed hours for an in-progress job, not inflated by the EST offset', async () => {
    // naive-ET start_time 7:00pm; real "now" is 7:30pm EST -- 0.5h real elapsed.
    DB.bookings = [
      { id: 'b2', tenant_id: TENANT_A, team_member_id: null, price: 10000, start_time: '2026-01-05T19:00:00', end_time: '2026-01-05T21:00:00', status: 'in_progress', payment_status: 'unpaid', service_type: 'clean' },
    ]
    const res = await GET(getReq())
    const body = await res.json()
    const row = body.live_ops[0]
    expect(row.duration_label).toBe('0.5h in')
  })

  it('finds a booking 2 real hours out as first_upcoming, not silently excluded', async () => {
    // naive-ET start_time 9:30pm same day -- real "now" is 7:30pm EST, 2h out.
    DB.bookings = [
      { id: 'b3', tenant_id: TENANT_A, team_member_id: null, price: 10000, start_time: '2026-01-05T21:30:00', end_time: '2026-01-05T23:00:00', status: 'scheduled', payment_status: 'unpaid', service_type: 'clean' },
    ]
    const res = await GET(getReq())
    const body = await res.json()
    expect(body.stats.first_upcoming).not.toBeNull()
    expect(body.stats.first_upcoming.start).toBe('2026-01-05T21:30:00')
  })
})
