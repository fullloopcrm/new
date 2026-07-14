import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/PUT /api/management-applications — permission gate.
 *
 * These routes review + approve/reject job candidates (PII: resume, photo,
 * video, phone, email). They previously called getTenantForRequest() only,
 * which succeeds for ANY tenant_members row regardless of role -- so a
 * 'staff' role user (rbac.ts grants staff only team.view, not team.edit)
 * could read every applicant's PII and flip an application's status.
 *
 * FIX: requirePermission('team.view') on GET, requirePermission('team.edit')
 * on PUT, matching the canonical /api/team-applications route.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: { id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { GET, PUT } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    management_applications: [
      { id: 'app-A1', tenant_id: 'tenant-A', status: 'pending', name: 'Alice' },
      { id: 'app-B1', tenant_id: 'tenant-B', status: 'pending', name: 'Bob' },
    ],
  }
})

describe('GET /api/management-applications — permission gate', () => {
  it('owner can list applications', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].id).toBe('app-A1')
  })

  it("sanity: 'staff' role (has team.view per rbac.ts) is still allowed to read", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/management-applications — permission gate', () => {
  it('owner can approve an application', async () => {
    const res = await PUT(putReq({ id: 'app-A1', status: 'hired' }))
    expect(res.status).toBe(200)
    expect(h.store.management_applications.find((a) => a.id === 'app-A1')?.status).toBe('hired')
  })

  it("PERMISSION PROBE: 'staff' role (team.view only, no team.edit) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(putReq({ id: 'app-A1', status: 'hired' }))
    expect(res.status).toBe(403)
    expect(h.store.management_applications.find((a) => a.id === 'app-A1')?.status).toBe('pending')
  })

  it("WRONG-TENANT PROBE: an owner from tenant A cannot touch tenant B's application", async () => {
    const res = await PUT(putReq({ id: 'app-B1', status: 'hired' }))
    expect(res.status).toBe(500)
    expect(h.store.management_applications.find((a) => a.id === 'app-B1')?.status).toBe('pending')
  })
})
