import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT/DELETE /api/sales-applications — permission gate.
 *
 * Both mutating verbs were gated on requirePermission('team.view') -- a
 * read-only permission granted to 'staff' (rbac.ts) with no team.edit. That
 * let any staff-role tenant member approve/reject or delete Commission Sales
 * Partner applications, the same write-gated-on-a-read-permission class
 * already fixed on this route's sibling /api/team-applications (which
 * correctly gates PUT/DELETE on team.edit).
 *
 * FIX: PUT and DELETE now require team.edit; GET stays team.view.
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

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { PUT, DELETE } from './route'

const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })
const deleteReq = (id: string) => new Request(`http://x?id=${id}`, { method: 'DELETE' })

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    sales_applications: [
      { id: 'sa-A1', tenant_id: 'tenant-A', status: 'pending', name: 'Alice' },
      { id: 'sa-B1', tenant_id: 'tenant-B', status: 'pending', name: 'Bob' },
    ],
  }
})

describe('PUT /api/sales-applications — permission gate', () => {
  it('owner can approve an application', async () => {
    const res = await PUT(putReq({ id: 'sa-A1', status: 'approved' }))
    expect(res.status).toBe(200)
    expect(h.store.sales_applications.find((a) => a.id === 'sa-A1')?.status).toBe('approved')
  })

  it("PERMISSION PROBE: 'staff' role (team.view only, no team.edit) is forbidden and nothing changes", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(putReq({ id: 'sa-A1', status: 'approved' }))
    expect(res.status).toBe(403)
    expect(h.store.sales_applications.find((a) => a.id === 'sa-A1')?.status).toBe('pending')
  })

  it("WRONG-TENANT PROBE: an owner from tenant A cannot touch tenant B's application", async () => {
    const res = await PUT(putReq({ id: 'sa-B1', status: 'approved' }))
    expect(res.status).toBe(500)
    expect(h.store.sales_applications.find((a) => a.id === 'sa-B1')?.status).toBe('pending')
  })
})

describe('DELETE /api/sales-applications — permission gate', () => {
  it('owner can delete an application', async () => {
    const res = await DELETE(deleteReq('sa-A1'))
    expect(res.status).toBe(200)
    expect(h.store.sales_applications.find((a) => a.id === 'sa-A1')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'staff' role (team.view only, no team.edit) is forbidden and nothing is deleted", async () => {
    roleHolder.role = 'staff'
    const res = await DELETE(deleteReq('sa-A1'))
    expect(res.status).toBe(403)
    expect(h.store.sales_applications.find((a) => a.id === 'sa-A1')).toBeDefined()
  })
})
