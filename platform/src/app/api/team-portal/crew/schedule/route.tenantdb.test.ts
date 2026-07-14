import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/team-portal/crew/schedule.
 * Proves the bookings query's tenantDb() auto-filter excludes a foreign-tenant
 * booking even if a caller-controlled id somehow ended up in the scope list.
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
    gte: (col: string, val: unknown) => { filters.push((r) => String(r[col]) >= String(val)); return c },
    lt: (col: string, val: unknown) => { filters.push((r) => String(r[col]) < String(val)); return c },
    not: () => c,
    order: () => Promise.resolve({ data: matched(), error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

let currentAuth = { id: 'member-a', tid: TENANT_A, role: 'manager' as const }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
  // Simulates a scope list that (incorrectly) includes a foreign-tenant id —
  // the tenantDb() filter must be the thing that actually excludes it.
  scopedMemberIds: async () => ['member-a', 'member-foreign'],
}))

import { GET } from './route'

beforeEach(() => {
  const now = new Date()
  const soon = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  DB.bookings = [
    { id: 'booking-a', tenant_id: TENANT_A, team_member_id: 'member-a', start_time: soon, status: 'confirmed' },
    { id: 'booking-foreign', tenant_id: TENANT_B, team_member_id: 'member-foreign', start_time: soon, status: 'confirmed' },
  ]
  currentAuth = { id: 'member-a', tid: TENANT_A, role: 'manager' }
})

describe('GET /api/team-portal/crew/schedule — tenantDb scoping', () => {
  it('excludes a foreign-tenant booking even if it leaked into the scope list', async () => {
    const req = new Request('https://x')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.jobs as Row[]).map((j) => j.id)
    expect(ids).toContain('booking-a')
    expect(ids).not.toContain('booking-foreign')
  })
})
