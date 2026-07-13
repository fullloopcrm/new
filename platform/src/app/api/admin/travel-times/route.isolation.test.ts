import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/travel-times — tenantDb() conversion wrong-tenant probe (P1/W1
 * backlog batch). The `bookings` reads and `clients` geocode-backfill
 * updates previously carried their own manual `.eq('tenant_id', tenantId)`;
 * that filter now comes solely from the wrapper — this proves tenant A's
 * route build never includes tenant B's bookings, even when both tenants
 * have bookings on the exact same date/time window.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId }, error: null }),
}))

import { GET } from './route'

function fixtures() {
  return {
    bookings: [
      // Tenant A: two jobs for tm-A1 on the same day → buildRoutes emits a route.
      { id: 'bk-A1', tenant_id: 'tenant-A', team_member_id: 'tm-A1', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T10:00:00', status: 'scheduled', clients: { id: 'c-A1', name: 'Alice Client', address: '1 A St', latitude: 40.0, longitude: -74.0 }, team_members: { id: 'tm-A1', name: 'Alice', has_car: true } },
      { id: 'bk-A2', tenant_id: 'tenant-A', team_member_id: 'tm-A1', start_time: '2026-08-01T13:00:00', end_time: '2026-08-01T14:00:00', status: 'scheduled', clients: { id: 'c-A2', name: 'Amy Client', address: '2 A St', latitude: 40.01, longitude: -74.01 }, team_members: { id: 'tm-A1', name: 'Alice', has_car: true } },
      // Tenant B: same date/time window as tenant A, exact same-shape data.
      { id: 'bk-B1', tenant_id: 'tenant-B', team_member_id: 'tm-B1', start_time: '2026-08-01T09:00:00', end_time: '2026-08-01T10:00:00', status: 'scheduled', clients: { id: 'c-B1', name: 'Bob Client', address: '1 B St', latitude: 41.0, longitude: -75.0 }, team_members: { id: 'tm-B1', name: 'Bob', has_car: true } },
      { id: 'bk-B2', tenant_id: 'tenant-B', team_member_id: 'tm-B1', start_time: '2026-08-01T13:00:00', end_time: '2026-08-01T14:00:00', status: 'scheduled', clients: { id: 'c-B2', name: 'Beth Client', address: '2 B St', latitude: 41.01, longitude: -75.01 }, team_members: { id: 'tm-B1', name: 'Bob', has_car: true } },
    ],
    clients: [],
  }
}

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.store = fixtures()
})

const getReq = (qs: string) => new Request(`http://x/api/admin/travel-times?${qs}`)

describe('GET /api/admin/travel-times — tenant isolation', () => {
  it("tenant A's single-date route only includes tenant A's team member", async () => {
    const res = await GET(getReq('date=2026-08-01') as never)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.map((r: { team_member_id: string }) => r.team_member_id)).toEqual(['tm-A1'])
  })

  it("tenant B's single-date route only includes tenant B's team member", async () => {
    h.tenantId = 'tenant-B'
    const res = await GET(getReq('date=2026-08-01') as never)
    const json = await res.json()

    expect(json.map((r: { team_member_id: string }) => r.team_member_id)).toEqual(['tm-B1'])
  })

  it("tenant A's date-range route never surfaces tenant B's day bucket", async () => {
    const res = await GET(getReq('from=2026-08-01&to=2026-08-02') as never)
    const json = await res.json()

    const allMemberIds = Object.values(json as Record<string, Array<{ team_member_id: string }>>)
      .flat()
      .map((r) => r.team_member_id)
    expect(allMemberIds).toEqual(['tm-A1'])
  })
})
