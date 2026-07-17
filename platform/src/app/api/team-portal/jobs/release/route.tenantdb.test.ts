import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of POST /api/team-portal/jobs/release.
 * The UPDATE used to carry a manual .eq('tenant_id', auth.tid) — this proves
 * releasing your own job never touches a foreign-tenant booking that shares
 * both the same booking id AND the same assigned member id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'member-a'
const BOOKING_ID = 'shared-booking-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return uc },
    select: () => uc,
    maybeSingle: async () => {
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
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(() => Promise.resolve()) }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT_A, status: 'active' }]
  DB.bookings = [
    { id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: MEMBER_ID, status: 'confirmed' },
    { id: BOOKING_ID, tenant_id: TENANT_B, team_member_id: MEMBER_ID, status: 'confirmed' },
  ]
  DB.tenants = [{ id: TENANT_A, selena_config: null }]
})

describe('POST /api/team-portal/jobs/release — tenantDb scoping', () => {
  it('releases only the caller tenant\'s booking, leaving a foreign-tenant row with the same booking+member id untouched', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 25, 'worker')
    const req = new NextRequest('https://x/api/team-portal/jobs/release', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    const bookingA = DB.bookings.find((r) => r.tenant_id === TENANT_A)!
    const bookingB = DB.bookings.find((r) => r.tenant_id === TENANT_B)!
    expect(bookingA.team_member_id).toBeNull()
    expect(bookingA.status).toBe('scheduled')
    expect(bookingB.team_member_id).toBe(MEMBER_ID)
    expect(bookingB.status).toBe('confirmed')
  })

  it('REJECTS (403) releasing a booking already checked into in_progress — mutation-verified', async () => {
    DB.bookings = [
      { id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: MEMBER_ID, status: 'in_progress', check_in_time: '2026-07-16T10:00:00Z' },
    ]
    const token = createToken(MEMBER_ID, TENANT_A, 25, 'worker')
    const req = new NextRequest('https://x/api/team-portal/jobs/release', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    const booking = DB.bookings[0]
    expect(booking.team_member_id).toBe(MEMBER_ID)
    expect(booking.status).toBe('in_progress')
  })

  it('REJECTS (403) releasing an already-completed booking', async () => {
    DB.bookings = [
      { id: BOOKING_ID, tenant_id: TENANT_A, team_member_id: MEMBER_ID, status: 'completed', team_member_pay: 15000, team_member_paid: true },
    ]
    const token = createToken(MEMBER_ID, TENANT_A, 25, 'worker')
    const req = new NextRequest('https://x/api/team-portal/jobs/release', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ booking_id: BOOKING_ID }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(DB.bookings[0].status).toBe('completed')
  })
})
