/**
 * PUT /api/team-portal/availability — RBAC-bypass regression.
 *
 * availability.edit_own is a tenant-customizable portal permission (see
 * lib/portal-rbac.ts + /api/settings/portal-permissions) presented in the
 * tenant-facing settings UI. The route used to gate on a bare token only —
 * a tenant that disabled availability.edit_own for a role had zero server-
 * side enforcement; every active team member could still edit their own
 * availability regardless of the tenant's permission matrix.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))

import { GET, PUT } from './route'
import { createToken } from '../auth/token'

const TENANT_A = 'tenant-A'
const WORKER = 'worker-1'

function putReq(body: unknown, token: string): Request {
  return new Request('http://localhost/api/team-portal/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}
function getReq(token: string): Request {
  return new Request('http://localhost/api/team-portal/availability', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    team_members: [{ id: WORKER, tenant_id: TENANT_A, name: 'A Worker', status: 'active', role: 'worker', notes: null }],
    tenants: [{ id: TENANT_A, selena_config: null }],
    bookings: [],
  }
})

describe('PUT /api/team-portal/availability — permission gate', () => {
  it('allows the edit by default (availability.edit_own is on for worker)', async () => {
    const token = createToken(WORKER, TENANT_A, 25, 'worker')
    const res = await PUT(putReq({ availability: { working_days: [1, 2, 3], blocked_dates: ['2026-08-01'] } }, token) as never)
    expect(res.status).toBe(200)
    const stored = JSON.parse(h.store.team_members[0].notes as string)
    expect(stored.availability.blocked_dates).toEqual(['2026-08-01'])
  })

  it('403s and does NOT write when the tenant has revoked availability.edit_own for this role', async () => {
    h.store.tenants[0].selena_config = { portal_role_permissions: { worker: { 'availability.edit_own': false } } }
    const token = createToken(WORKER, TENANT_A, 25, 'worker')
    const res = await PUT(putReq({ availability: { working_days: [1, 2, 3], blocked_dates: ['2026-08-01'] } }, token) as never)
    expect(res.status).toBe(403)
    expect(h.store.team_members[0].notes).toBeNull()
  })

  it('401s an unauthenticated PUT, no write', async () => {
    const res = await PUT(new Request('http://localhost/api/team-portal/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability: { working_days: [], blocked_dates: [] } }),
    }) as never)
    expect(res.status).toBe(401)
    expect(h.store.team_members[0].notes).toBeNull()
  })
})

describe('GET /api/team-portal/availability', () => {
  it('still returns the own-availability view regardless of the edit_own override (read is not gated)', async () => {
    h.store.tenants[0].selena_config = { portal_role_permissions: { worker: { 'availability.edit_own': false } } }
    h.store.team_members[0].notes = JSON.stringify({ availability: { working_days: [1], blocked_dates: ['x'] } })
    const token = createToken(WORKER, TENANT_A, 25, 'worker')
    const res = await GET(getReq(token) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.availability.blocked_dates).toEqual(['x'])
  })
})
