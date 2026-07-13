import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of GET /api/team-portal/travel-times.
 * This route returns client names + full home addresses + geo, so a tenant leak
 * here is a real PII exposure, not just a data-shape bug. Both the team_members
 * and bookings lookups carried manual .eq('tenant_id', auth.tid) filters --
 * proves tenantDb() still excludes a foreign-tenant booking that happens to
 * share this member's id (e.g. a cross-tenant id collision or a caller bug).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const DATE = '2026-07-13'

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
    lte: () => c,
    not: () => c,
    order: () => c,
    single: () => { const m = matched(); return Promise.resolve({ data: m[0] || null, error: null }) },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

let currentAuth = { id: 'member-a', tid: TENANT_A, role: 'cleaner' as const }
vi.mock('@/lib/team-portal-auth', () => ({
  requirePortalPermission: async () => ({ auth: currentAuth, error: null }),
}))

import { GET } from './route'

beforeEach(() => {
  DB.team_members = [
    { id: 'member-a', tenant_id: TENANT_A, has_car: true },
    // Same id, different tenant -- must never be the row that resolves for a TENANT_A request.
    { id: 'member-a', tenant_id: TENANT_B, has_car: false },
  ]
  DB.bookings = [
    { id: 'booking-own-1', tenant_id: TENANT_A, team_member_id: 'member-a', client_id: 'client-a', start_time: `${DATE}T09:00:00`, end_time: `${DATE}T10:00:00`, status: 'confirmed', clients: { id: 'client-a', name: 'Own Client', address: '1 Own St', latitude: 40.7, longitude: -74.0 } },
    { id: 'booking-own-2', tenant_id: TENANT_A, team_member_id: 'member-a', client_id: 'client-a2', start_time: `${DATE}T13:00:00`, end_time: `${DATE}T14:00:00`, status: 'confirmed', clients: { id: 'client-a2', name: 'Own Client Two', address: '2 Own St', latitude: 40.71, longitude: -74.01 } },
    // Foreign-tenant booking sharing this member's id -- must be excluded by tenantDb().
    { id: 'booking-foreign', tenant_id: TENANT_B, team_member_id: 'member-a', client_id: 'client-b', start_time: `${DATE}T11:00:00`, end_time: `${DATE}T12:00:00`, status: 'confirmed', clients: { id: 'client-b', name: 'Foreign Client', address: '3 Foreign St', latitude: 40.72, longitude: -74.02 } },
  ]
  currentAuth = { id: 'member-a', tid: TENANT_A, role: 'cleaner' }
})

describe('GET /api/team-portal/travel-times — tenantDb scoping', () => {
  it('excludes a foreign-tenant booking even when it shares this member id', async () => {
    const req = new Request(`https://x?date=${DATE}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const bookingIds = (body as Row[]).filter((r) => r.booking_id).map((r) => r.booking_id)
    expect(bookingIds).toContain('booking-own-1')
    expect(bookingIds).toContain('booking-own-2')
    expect(bookingIds).not.toContain('booking-foreign')
    // Foreign client's name must never surface, confirming no PII leak.
    const clientNames = (body as Row[]).map((r) => r.client_name)
    expect(clientNames).not.toContain('Foreign')
  })
})
