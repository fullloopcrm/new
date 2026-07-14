import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * PUT/DELETE /api/campaigns/:id — permission gate.
 *
 * Both verbs called getTenantForRequest() only, with zero permission check --
 * any tenant member of ANY role (a 'manager', who rbac.ts grants only
 * campaigns.view, or 'staff', who has no campaigns permission at all) could
 * edit a campaign's body/subject, delete it, or flip `status` straight to
 * 'approved' (the exact field campaigns.send's approval gate checks). The
 * sibling POST /api/campaigns (create) already correctly requires
 * campaigns.create -- PUT/DELETE now match it.
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
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

// Real requirePermission + real rbac run against the mocked tenant-query above.
import { PUT, DELETE } from './route'

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const putReq = (body: unknown) => new Request('http://x', { method: 'PUT', body: JSON.stringify(body) })

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    campaigns: [
      { id: 'camp-A1', tenant_id: 'tenant-A', status: 'draft', name: 'Spring Sale', body: 'orig' },
      { id: 'camp-B1', tenant_id: 'tenant-B', status: 'draft', name: 'Other tenant', body: 'orig' },
    ],
  }
})

describe('PUT /api/campaigns/:id — permission gate', () => {
  it('owner can edit their own campaign', async () => {
    const res = await PUT(putReq({ body: 'updated' }), params('camp-A1'))
    expect(res.status).toBe(200)
    expect(h.store.campaigns.find((c) => c.id === 'camp-A1')?.body).toBe('updated')
  })

  it("PERMISSION PROBE: 'manager' role (campaigns.view only, no campaigns.create) is forbidden and nothing changes", async () => {
    roleHolder.role = 'manager'
    const res = await PUT(putReq({ status: 'approved' }), params('camp-A1'))
    expect(res.status).toBe(403)
    expect(h.store.campaigns.find((c) => c.id === 'camp-A1')?.status).toBe('draft')
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns permission at all) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(putReq({ body: 'hijacked' }), params('camp-A1'))
    expect(res.status).toBe(403)
    expect(h.store.campaigns.find((c) => c.id === 'camp-A1')?.body).toBe('orig')
  })

  it("WRONG-TENANT PROBE: an owner from tenant A cannot touch tenant B's campaign", async () => {
    const res = await PUT(putReq({ body: 'hijacked' }), params('camp-B1'))
    expect(res.status).toBe(500)
    expect(h.store.campaigns.find((c) => c.id === 'camp-B1')?.body).toBe('orig')
  })
})

describe('DELETE /api/campaigns/:id — permission gate', () => {
  it('owner can delete their own campaign', async () => {
    const res = await DELETE(new Request('http://x'), params('camp-A1'))
    expect(res.status).toBe(200)
    expect(h.store.campaigns.find((c) => c.id === 'camp-A1')).toBeUndefined()
  })

  it("PERMISSION PROBE: 'manager' role (campaigns.view only) is forbidden and nothing is deleted", async () => {
    roleHolder.role = 'manager'
    const res = await DELETE(new Request('http://x'), params('camp-A1'))
    expect(res.status).toBe(403)
    expect(h.store.campaigns.find((c) => c.id === 'camp-A1')).toBeDefined()
  })
})
