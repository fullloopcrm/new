import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PATCH /api/routes/[id] reassigned team_member_id with zero tenant-ownership
 * check. Both GET /api/routes and GET /api/routes/[id] join team_members(id,
 * name, phone, home_latitude, home_longitude) off that FK, so a foreign id
 * leaked that member's name, phone, and home coordinates. Same class as the
 * sibling POST fix in ../route.ts.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  return { supabaseAdmin: createFakeSupabase() }
})

const TENANT = 'tenant-A'
const OTHER_TENANT = 'tenant-B'
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const ROUTE_ID = 'route-1'
const TM_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_TM = '44444444-4444-4444-4444-444444444444'

function patchReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/routes/route-1', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
function params() {
  return { params: Promise.resolve({ id: ROUTE_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('routes', [{ id: ROUTE_ID, tenant_id: TENANT, team_member_id: TM_A }])
  fake._seed('team_members', [
    { id: TM_A, tenant_id: TENANT, name: 'Member A' },
    { id: FOREIGN_TM, tenant_id: OTHER_TENANT, name: 'Foreign Member' },
  ])
  fake._seed('bookings', [])
})

describe('PATCH /api/routes/[id] — team_member_id reassignment FK-injection guard', () => {
  it('rejects reassigning to a team_member_id belonging to another tenant, leaves the route untouched', async () => {
    const res = await PATCH(patchReq({ team_member_id: FOREIGN_TM }), params())
    expect(res.status).toBe(404)
    expect(fake._all('routes')[0].team_member_id).toBe(TM_A)
  })

  it('accepts reassigning to a team_member_id genuinely owned by the caller tenant (control)', async () => {
    const res = await PATCH(patchReq({ team_member_id: TM_A, status: 'draft' }), params())
    expect(res.status).toBe(200)
  })

  it('accepts clearing team_member_id to null', async () => {
    const res = await PATCH(patchReq({ team_member_id: null }), params())
    expect(res.status).toBe(200)
    expect(fake._all('routes')[0].team_member_id).toBe(null)
  })
})
