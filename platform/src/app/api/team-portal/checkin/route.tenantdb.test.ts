import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/team-portal/checkin.
 * The booking read/update used to carry a manual .eq('tenant_id', auth.tid).
 * Proves a member checking in never reads or writes a foreign tenant's
 * booking row sharing the same booking id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'shared-member-id'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    select: () => uc,
    single: async () => {
      const matched = rows.filter((r) => filters.every((f) => f(r)))
      matched.forEach((r) => Object.assign(r, values))
      return { data: matched[0] ?? null, error: null }
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/nycmaid/tenant', () => ({ isNycMaid: () => false }))
vi.mock('@/lib/nycmaid/geo', () => ({
  geocodeAddress: vi.fn(),
  calculateDistance: vi.fn(),
  CHECK_IN_MAX_MILES: 0.5,
  CHECK_IN_HARD_BLOCK_MILES: 2,
  CHECK_IN_GPS_ENABLED: false,
}))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_A, status: 'confirmed', team_member_id: MEMBER_ID, start_time: '2020-01-01T09:00:00', check_in_time: null, notes: null },
    { id: BOOKING_ID, tenant_id: TENANT_B, status: 'confirmed', team_member_id: MEMBER_ID, start_time: '2020-01-01T09:00:00', check_in_time: null, notes: null },
  ]
})

describe('POST /api/team-portal/checkin — tenantDb scoping', () => {
  it('checks in only the caller tenant\'s booking row sharing the booking id, never the foreign tenant\'s', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/checkin', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    const bookingB = DB.bookings.find((r) => r.tenant_id === TENANT_B)!
    expect(bookingA.check_in_time).not.toBeNull()
    expect(bookingA.status).toBe('in_progress')
    expect(bookingB.check_in_time).toBeNull()
    expect(bookingB.status).toBe('confirmed')
  })
})

describe('POST /api/team-portal/checkin — status guard', () => {
  // A booking cancelled (or marked no-show) before the assigned cleaner ever
  // checked in still has check_in_time === null, so the double-check-in guard
  // alone would not stop it. Without a status check, checking in would flip it
  // to 'in_progress' and checkout would then complete it with real
  // payment/payroll side effects for a job that was cancelled.
  it('400s: a cancelled booking cannot be checked in', async () => {
    DB.bookings = [
      { id: BOOKING_ID, tenant_id: TENANT_A, status: 'cancelled', team_member_id: MEMBER_ID, start_time: '2020-01-01T09:00:00', check_in_time: null, notes: null },
    ]
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/checkin', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    expect(bookingA.status).toBe('cancelled')
    expect(bookingA.check_in_time).toBeNull()
  })

  it('400s: a no-show booking cannot be checked in', async () => {
    DB.bookings = [
      { id: BOOKING_ID, tenant_id: TENANT_A, status: 'no_show', team_member_id: MEMBER_ID, start_time: '2020-01-01T09:00:00', check_in_time: null, notes: null },
    ]
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/checkin', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
