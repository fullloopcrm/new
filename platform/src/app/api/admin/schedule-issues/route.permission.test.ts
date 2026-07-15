import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/PUT /api/admin/schedule-issues — schedules.view/schedules.edit gate
 * (broad-hunt: session-auth only, no requirePermission check, despite PUT
 * resolving/dismissing issues with resolved_by hardcoded to 'admin'
 * regardless of the caller's actual role). Every role has schedules.view
 * (even staff), so GET stays open to all roles; only schedules.edit
 * (staff/manager lack it — manager has schedules.edit per rbac.ts, only
 * staff is excluded) gates the mutating PUT.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {
    schedule_issues: [{ id: 'iss-A1', tenant_id: 'tenant-A', status: 'open', severity: 1, message: 'a' }],
  }
})

describe('GET /api/admin/schedule-issues — schedules.view permission', () => {
  it('allows staff (has schedules.view) to list issues', async () => {
    const res = await GET(new Request('http://x'))
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/admin/schedule-issues — schedules.edit permission', () => {
  it('rejects staff (no schedules.edit) with 403 and leaves the issue untouched', async () => {
    const res = await PUT(putReq({ id: 'iss-A1', status: 'resolved' }))
    expect(res.status).toBe(403)
    expect(h.store.schedule_issues[0].status).toBe('open')
  })

  it('allows a manager (has schedules.edit) to resolve an issue', async () => {
    h.role = 'manager'
    const res = await PUT(putReq({ id: 'iss-A1', status: 'resolved' }))
    expect(res.status).toBe(200)
    expect(h.store.schedule_issues[0].status).toBe('resolved')
  })
})
