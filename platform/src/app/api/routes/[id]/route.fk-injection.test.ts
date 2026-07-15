/**
 * PATCH /api/routes/[id] — cross-tenant FK injection on team_member_id, same
 * class as the POST /api/routes fix. team_member_id was blindly copied out of
 * the assignables allowlist with only tenant_id on the WHERE clause of the
 * update — nothing verified the FK value itself belonged to the caller's
 * tenant. GET /api/routes/[id] embeds team_members(name, phone,
 * home_latitude, home_longitude) off this FK, so an unverified foreign id
 * would leak another tenant's team member PII (including home address).
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

import { PATCH } from './route'

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'

const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => {
  h.seq = 0
  h.requirePermission.mockReset()
  h.requirePermission.mockImplementation(async () => ({ tenant: { tenantId: TENANT_A }, error: null }))
  h.store = {
    team_members: [
      { id: 'tm-A1', tenant_id: TENANT_A, name: 'Sam A' },
      { id: 'tm-B1', tenant_id: TENANT_B, name: 'Sam B (secret)' },
    ],
    routes: [{ id: 'route-1', tenant_id: TENANT_A, team_member_id: 'tm-A1', status: 'draft', stops: [] }],
    bookings: [],
  }
})

describe('PATCH /api/routes/[id] — cross-tenant FK injection', () => {
  it("rejects a team_member_id belonging to another tenant instead of writing it", async () => {
    const res = await PATCH(patchReq({ team_member_id: 'tm-B1' }), params('route-1'))

    expect(res.status).toBe(404)
    expect(h.store.routes[0].team_member_id).toBe('tm-A1')
  })

  it('updates the route when the team_member_id genuinely belongs to the caller tenant', async () => {
    h.store.team_members.push({ id: 'tm-A2', tenant_id: TENANT_A, name: 'Sam A2' })
    const res = await PATCH(patchReq({ team_member_id: 'tm-A2' }), params('route-1'))

    expect(res.status).toBe(200)
    expect(h.store.routes[0].team_member_id).toBe('tm-A2')
  })

  it('allows clearing the team_member_id back to null', async () => {
    const res = await PATCH(patchReq({ team_member_id: null }), params('route-1'))

    expect(res.status).toBe(200)
    expect(h.store.routes[0].team_member_id).toBeNull()
  })
})
