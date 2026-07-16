import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST/PATCH/DELETE /api/catalog — permission gate.
 *
 * BUG (fixed here): every handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * this is the exact same `service_types` table managed under
 * /api/settings/services (also fixed alongside this, see P80 in
 * cross-tenant-leak-register.md), which is a sibling of every other
 * /api/settings/* route already gated behind settings.view/settings.edit.
 *
 * NOT override-only: by default rbac.ts grants 'settings.edit' to
 * owner/admin only, and 'settings.view' to owner/admin/manager only —
 * 'staff' gets neither. So any manager could already create/edit/delete a
 * catalog item (price, cost, active flag) and any staff-tier member could
 * read the full catalog including cost_cents, with zero role check, no
 * override needed — same class as P72/P76/P77/P78/P79.
 *
 * FIX: requirePermission('settings.view') on GET,
 * requirePermission('settings.edit') on POST+PATCH+DELETE — matching the
 * established settings.* gating convention used by every other
 * /api/settings/* route.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

import { GET, POST, PATCH, DELETE } from './route'

function seed() {
  return {
    service_types: [
      { id: 'svc-a1', tenant_id: A, name: 'Standard Clean', item_type: 'service', per_unit: 'hour', price_cents: 5000, default_hourly_rate: null, sort_order: 1, active: true },
    ],
    audit_logs: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function jsonReq(method: string, body: unknown): Request {
  return { method, json: async () => body } as unknown as Request
}

describe('GET /api/catalog — permission probe', () => {
  it('owner (has settings.view) can list the catalog', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.view per default rbac.ts, no override needed) is forbidden from listing the catalog", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/catalog — permission probe', () => {
  it('owner (has settings.edit) can create a catalog item', async () => {
    const res = await POST(jsonReq('POST', { name: 'New Item' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit per default rbac.ts, no override needed) is forbidden from creating a catalog item", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(jsonReq('POST', { name: 'New Item' }))
    expect(res.status).toBe(403)
    expect(h.seed.service_types).toHaveLength(1)
  })
})

describe('PATCH /api/catalog — permission probe', () => {
  it('owner (has settings.edit) can update a catalog item', async () => {
    const res = await PATCH(jsonReq('PATCH', { id: 'svc-a1', name: 'Renamed' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit per default rbac.ts, no override needed) is forbidden from updating a catalog item", async () => {
    tenantHolder.role = 'manager'
    const res = await PATCH(jsonReq('PATCH', { id: 'svc-a1', name: 'HIJACKED' }))
    expect(res.status).toBe(403)
    expect(h.seed.service_types.find((r) => r.id === 'svc-a1')!.name).toBe('Standard Clean')
  })

  it("PERMISSION PROBE: a tenant that revokes 'settings.edit' from admin via override blocks PATCH for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'settings.edit': false } } },
    }
    const res = await PATCH(jsonReq('PATCH', { id: 'svc-a1', name: 'HIJACKED' }))
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/catalog — permission probe', () => {
  it('owner (has settings.edit) can delete a catalog item', async () => {
    const res = await DELETE(new Request('http://t/api/catalog?id=svc-a1', { method: 'DELETE' }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.edit per default rbac.ts, no override needed) is forbidden from deleting a catalog item", async () => {
    tenantHolder.role = 'staff'
    const res = await DELETE(new Request('http://t/api/catalog?id=svc-a1', { method: 'DELETE' }))
    expect(res.status).toBe(403)
    expect(h.seed.service_types.some((r) => r.id === 'svc-a1')).toBe(true)
  })
})
