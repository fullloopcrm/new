import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET/PUT /api/team-portal/availability.
 * All queries used to carry a manual .eq('tenant_id', auth.tid). This proves
 * a member reading/writing their own availability never touches a
 * foreign-tenant team_members row sharing the same member id, and the
 * blocked-bookings conflict check never sees a foreign tenant's booking.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'shared-member-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
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
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) >= (val as string)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => (r[col] as string) <= (val as string)); return c },
    limit: (n: number) => Promise.resolve({ data: matched().slice(0, n), error: null }),
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    update: (values: Row) => updateChain(rowsOf(), values),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(() => Promise.resolve()) }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET, PUT } from './route'

beforeEach(() => {
  DB.team_members = [
    { id: MEMBER_ID, tenant_id: TENANT_A, name: 'A Own', notes: JSON.stringify({ availability: { working_days: [1, 2, 3], blocked_dates: [] } }) },
    { id: MEMBER_ID, tenant_id: TENANT_B, name: 'B Foreign', notes: JSON.stringify({ availability: { working_days: [4, 5], blocked_dates: [] } }) },
  ]
  // A foreign-tenant booking for a colliding member id on the date being
  // requested off — must NOT block tenant A's request.
  DB.bookings = [
    { id: 'foreign-booking', tenant_id: TENANT_B, team_member_id: MEMBER_ID, start_time: '2026-08-05T14:00:00', status: 'confirmed', clients: { name: 'Foreign Client' } },
  ]
})

describe('GET /api/team-portal/availability — tenantDb scoping', () => {
  it('reads only the caller tenant\'s own availability, not a foreign-tenant row sharing the member id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/availability', {
      headers: { authorization: `Bearer ${token}` },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.availability.working_days).toEqual([1, 2, 3])
  })
})

describe('PUT /api/team-portal/availability — tenantDb scoping', () => {
  it('does not block a time-off request on a foreign tenant\'s booking sharing the member id, and updates only the caller tenant\'s row', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 0, 'worker')
    const req = new NextRequest('https://x/api/team-portal/availability', {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ availability: { working_days: [1, 2, 3], blocked_dates: ['2026-08-05'] } }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)

    const memberA = DB.team_members.find((r) => r.tenant_id === TENANT_A)!
    const memberB = DB.team_members.find((r) => r.tenant_id === TENANT_B)!
    const parsedA = JSON.parse(memberA.notes as string)
    const parsedB = JSON.parse(memberB.notes as string)
    expect(parsedA.availability.blocked_dates).toEqual(['2026-08-05'])
    expect(parsedB.availability.blocked_dates).toEqual([])
  })
})
