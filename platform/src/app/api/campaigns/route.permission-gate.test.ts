import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/campaigns — campaigns.view gate.
 *
 * Called getTenantForRequest() directly with zero permission check, unlike
 * the sibling POST (already gated on campaigns.create). Per rbac.ts, 'staff'
 * has no campaigns.view -- any authenticated tenant member, including staff,
 * could list every campaign's subject/body content and recipient_filter
 * criteria regardless of the tenant's own RBAC customization.
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

import { GET } from './route'

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    campaigns: [
      { id: 'camp-A1', tenant_id: 'tenant-A', status: 'draft', name: 'Spring Sale', body: 'secret pitch' },
    ],
  }
})

describe('GET /api/campaigns — campaigns.view permission gate', () => {
  it('owner (has campaigns.view) can list campaigns', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.campaigns).toHaveLength(1)
  })

  it("PERMISSION PROBE: 'staff' role (no campaigns permission at all) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'manager' role (has campaigns.view) can list", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
