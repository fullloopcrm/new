import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * POST /api/routes wrote a client-supplied team_member_id into
 * routes.team_member_id with zero tenant-ownership check. Both GET /api/routes
 * and GET /api/routes/[id] join team_members(id, name, phone, home_latitude,
 * home_longitude) off that FK, so a foreign id leaked that member's name,
 * phone, and home coordinates into the calling tenant's route response.
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
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TM_A = '11111111-1111-1111-1111-111111111111'
const FOREIGN_TM = '44444444-4444-4444-4444-444444444444'

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/routes', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [
    { id: TM_A, tenant_id: TENANT, name: 'Member A', home_latitude: 1, home_longitude: 1, address: 'A St' },
    { id: FOREIGN_TM, tenant_id: OTHER_TENANT, name: 'Foreign Member', home_latitude: 2, home_longitude: 2, address: 'B St' },
  ])
  fake._seed('tenants', [{ id: TENANT, hq_latitude: 0, hq_longitude: 0, address: 'HQ' }])
  fake._seed('routes', [])
})

describe('POST /api/routes — team_member_id FK-injection guard', () => {
  it('rejects a team_member_id belonging to another tenant, creates no route', async () => {
    const res = await POST(postReq({ route_date: '2026-01-01', team_member_id: FOREIGN_TM }))
    expect(res.status).toBe(404)
    expect(fake._all('routes').length).toBe(0)
  })

  it('accepts a team_member_id genuinely owned by the caller tenant (control)', async () => {
    const res = await POST(postReq({ route_date: '2026-01-01', team_member_id: TM_A }))
    expect(res.status).toBe(200)
    expect(fake._all('routes')[0].team_member_id).toBe(TM_A)
  })

  it('allows omitting team_member_id entirely', async () => {
    const res = await POST(postReq({ route_date: '2026-01-01' }))
    expect(res.status).toBe(200)
    expect(fake._all('routes')[0].team_member_id).toBe(null)
  })
})
