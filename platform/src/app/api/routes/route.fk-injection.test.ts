/**
 * POST /api/routes — cross-tenant FK injection on team_member_id (same class
 * as bookings/[id]'s P9-P11 register). The route wrote body.team_member_id
 * straight into the insert with only tenant_id on the row itself — nothing
 * verified the FK VALUE belonged to the caller's tenant. Both GET /api/routes
 * and GET /api/routes/[id] embed team_members(name, phone, home_latitude,
 * home_longitude) off this FK, so an unverified foreign id would leak another
 * tenant's team member PII (including home address) cross-tenant, and
 * POST /api/routes/[id]/publish would text a real SMS to that stranger's phone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeSupabaseFake } from '@/test/supabase-fake'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const fake = makeSupabaseFake(h, { detachReads: true })
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({ requirePermission: (...a: unknown[]) => h.requirePermission(...a) }))
// Also mock the pre-fix route's auth call so a mutation-test run against the
// pre-fix code path (which called getTenantForRequest directly, no
// permission gate) exercises the same tenant context instead of 500ing on
// real cookies()/headers() — isolates the FK-injection behavior being tested.
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 'tenant-A' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { POST } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: TENANT_A, name: 'Sam A', home_latitude: 40.1, home_longitude: -73.1, address: '1 A St' },
      { id: 'tm-B1', tenant_id: TENANT_B, name: 'Sam B (secret)', home_latitude: 41.9, home_longitude: -74.9, address: '9 B Ave (secret)' },
    ],
    tenants: [{ id: TENANT_A, hq_latitude: null, hq_longitude: null, address: null }],
    routes: [],
    bookings: [],
  }
})

describe('POST /api/routes — cross-tenant FK injection', () => {
  it("rejects a team_member_id belonging to another tenant instead of writing it", async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', team_member_id: 'tm-B1' }))

    expect(res.status).toBe(404)
    expect(h.store.routes).toHaveLength(0)
  })

  it('creates the route when the team_member_id genuinely belongs to the caller tenant', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01', team_member_id: 'tm-A1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.route.team_member_id).toBe('tm-A1')
    expect(json.route.start_latitude).toBe(40.1)
  })

  it('creates a route with no team member when team_member_id is omitted', async () => {
    const res = await POST(postReq({ route_date: '2026-08-01' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.route.team_member_id).toBeNull()
  })
})
