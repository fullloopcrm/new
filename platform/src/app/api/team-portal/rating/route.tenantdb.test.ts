import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/team-portal/rating.
 * The team_members lookup used to carry a manual .eq('tenant_id', auth.tid)
 * filter alongside .eq('id', teamMemberId) — proves the tenantDb() auto-filter
 * still returns the CALLER's own tenant's row when a foreign tenant happens to
 * reuse the same team_member_id (member IDs are not guaranteed globally unique
 * across tenants).
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
  // Same member id under two different tenants — status:'active' satisfies
  // requirePortalPermission's own instant-revocation check.
  DB.team_members = [
    { id: MEMBER_ID, tenant_id: TENANT_A, status: 'active', avg_rating: 4.5, rating_count: 10 },
    { id: MEMBER_ID, tenant_id: TENANT_B, status: 'active', avg_rating: 2.0, rating_count: 3 },
  ]
  DB.tenants = []
})

describe('GET /api/team-portal/rating — tenantDb scoping', () => {
  it('returns the caller tenant\'s own rating, not a foreign tenant sharing the same member id', async () => {
    const token = createToken(MEMBER_ID, TENANT_A, 30, 'worker')
    const req = new NextRequest('https://x/api/team-portal/rating', { headers: { authorization: `Bearer ${token}` } })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.avg).toBe(4.5)
    expect(body.count).toBe(10)
  })
})
