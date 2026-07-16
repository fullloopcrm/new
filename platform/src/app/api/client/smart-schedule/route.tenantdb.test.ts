import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of the team_members read
 * in GET /api/client/smart-schedule (the unscored-picker fallback branch).
 * The route is public (no session), so tenantId is bootstrapped from the
 * client row itself; a route that silently reverted to unscoped
 * supabaseAdmin for the team_members query would leak a foreign tenant's
 * active team into the picker if two tenants' ids ever collided or the
 * filter were dropped.
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
    gte: () => c,
    order: () => c,
    maybeSingle: async () => ({ data: matched()[0] || null, error: null }),
    insert: async (row: Row) => { rowsOf().push(row); return { error: null } },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/smart-schedule', () => ({ scoreTeamForBooking: async () => [], suggestBookingSlots: async () => [] }))

import { GET } from './route'

beforeEach(() => {
  DB.clients = []
  DB.team_members = []
})

describe('GET /api/client/smart-schedule — tenantDb scoping (picker fallback)', () => {
  it('excludes a foreign tenant team member from the unscored picker list', async () => {
    DB.clients.push({ id: 'c-1', tenant_id: TENANT_A, address: '1 Main St', preferred_team_member_id: null })
    DB.team_members.push({ id: 'tm-mine', tenant_id: TENANT_A, name: 'Alice', active: true })
    DB.team_members.push({ id: 'tm-foreign', tenant_id: TENANT_B, name: 'Evil', active: true })

    const res = await GET(new Request('https://x?client_id=c-1'))
    const body = await res.json() as { cleaners: Row[] }
    const ids = body.cleaners.map((c) => c.id)
    expect(ids).toContain('tm-mine')
    expect(ids).not.toContain('tm-foreign')
  })

  it('returns an empty list when the client cannot be resolved to a tenant', async () => {
    const res = await GET(new Request('https://x?client_id=missing'))
    const body = await res.json() as { cleaners: Row[] }
    expect(body.cleaners).toEqual([])
  })
})
