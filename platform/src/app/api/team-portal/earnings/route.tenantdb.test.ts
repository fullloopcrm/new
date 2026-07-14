import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/team-portal/earnings.
 * Every team_members/bookings query in this route used to carry a manual
 * .eq('tenant_id', auth.tid) filter — proves the tenantDb() auto-filter still
 * excludes a foreign-tenant booking that happens to share the same
 * team_member_id (member IDs are not guaranteed globally unique across tenants).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const MEMBER_ID = 'shared-member-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    neq: (col: string, val: unknown) => { filters.push((r) => r[col] !== val); return c },
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    lte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) <= String(val)); return c },
    order: () => c,
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/team-portal/auth/token'
import { GET } from './route'

beforeEach(() => {
  DB.team_members = [{ id: MEMBER_ID, tenant_id: TENANT_A, pay_rate: 30 }]
  // A foreign-tenant booking that happens to reuse the same team_member_id —
  // without the tenant_id filter this would leak into tenant A's YTD earnings.
  DB.bookings = [
    { id: 'booking-foreign', tenant_id: TENANT_B, team_member_id: MEMBER_ID, start_time: new Date().toISOString(), status: 'completed', pay_rate: 999, team_member_pay: null, check_in_time: null, check_out_time: null },
  ]
})

describe('GET /api/team-portal/earnings — tenantDb scoping', () => {
  it('does not count a foreign-tenant booking sharing the same team_member_id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 30, 'worker')
    const req = new NextRequest('https://x/api/team-portal/earnings', { headers: { authorization: `Bearer ${token}` } })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.earnings.yearJobsCount).toBe(0)
    expect(body.earnings.yearlyPay).toBe(0)
  })
})
