import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/team-portal/crew/earnings.
 * The route already scoped by role (scopedMemberIds) but both underlying queries
 * (team_members, bookings) carried a manual .eq('tenant_id', auth.tid) -- this
 * proves the tenantDb() auto-filter still excludes a foreign-tenant member/job
 * even if a caller-controlled id somehow ended up in the scope list. Pay
 * visibility is the most sensitive team-portal permission (see route comment).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'

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
    gte: () => c,
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

let currentAuth = { id: 'member-a', tid: TENANT_A, role: 'manager' as const }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
  // Simulates a scope list that (incorrectly) includes a foreign-tenant id --
  // the tenantDb() filter must be the thing that actually excludes it.
  scopedMemberIds: async () => ['member-a', 'member-foreign'],
}))

import { GET } from './route'

beforeEach(() => {
  DB.team_members = [
    { id: 'member-a', tenant_id: TENANT_A, name: 'A Own', pay_rate: 25 },
    { id: 'member-foreign', tenant_id: TENANT_B, name: 'B Foreign', pay_rate: 25 },
  ]
  DB.bookings = [
    { team_member_id: 'member-a', pay_rate: 30, start_time: new Date().toISOString(), end_time: null, check_in_time: new Date(Date.now() - 3_600_000).toISOString(), check_out_time: new Date().toISOString(), status: 'completed' },
    { team_member_id: 'member-foreign', pay_rate: 999, start_time: new Date().toISOString(), end_time: null, check_in_time: new Date(Date.now() - 3_600_000).toISOString(), check_out_time: new Date().toISOString(), status: 'completed' },
  ]
  currentAuth = { id: 'member-a', tid: TENANT_A, role: 'manager' }
})

describe('GET /api/team-portal/crew/earnings — tenantDb scoping', () => {
  it('excludes a foreign-tenant member and their pay even if it leaked into the scope list', async () => {
    const req = new Request('https://x')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const names = (body.members as Row[]).map((m) => m.name)
    expect(names).toContain('A Own')
    expect(names).not.toContain('B Foreign')
  })
})
