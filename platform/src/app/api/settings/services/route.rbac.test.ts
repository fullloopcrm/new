import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/settings/services — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * every sibling /api/settings/* route (settings/route.ts,
 * settings/team/route.ts, settings/permissions/route.ts,
 * settings/page-config/route.ts, settings/portal-permissions/route.ts) is
 * already gated behind settings.view/settings.edit. This route and its
 * [id] sibling (also fixed, see P80 in cross-tenant-leak-register.md) were
 * missed entirely, along with /api/catalog which manages the same
 * service_types table under a different path.
 *
 * NOT override-only: by default rbac.ts grants 'settings.edit' to
 * owner/admin only, and 'settings.view' to owner/admin/manager only —
 * 'staff' gets neither. So any manager could already create a service and
 * any staff-tier member could read the full service list with pricing,
 * with zero role check, no override needed — same class as
 * P72/P76/P77/P78/P79.
 *
 * FIX: requirePermission('settings.view') on GET,
 * requirePermission('settings.edit') on POST.
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

import { GET, POST } from './route'

function seed() {
  return {
    service_types: [{ id: 'svc-a1', tenant_id: A, name: 'Standard Clean', sort_order: 2 }],
    audit_log: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('GET /api/settings/services — permission probe', () => {
  it('owner (has settings.view) can list services', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no settings.view per default rbac.ts, no override needed) is forbidden from listing services", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/settings/services — permission probe', () => {
  it('owner (has settings.edit) can create a service', async () => {
    const req = new Request('http://t/api/settings/services', { method: 'POST', body: JSON.stringify({ name: 'New Service' }) })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })

  it("PERMISSION PROBE: 'manager' (no settings.edit per default rbac.ts, no override needed) is forbidden from creating a service", async () => {
    tenantHolder.role = 'manager'
    const req = new Request('http://t/api/settings/services', { method: 'POST', body: JSON.stringify({ name: 'New Service' }) })
    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(h.seed.service_types).toHaveLength(1)
  })

  it("PERMISSION PROBE: a tenant that revokes 'settings.edit' from admin via override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'settings.edit': false } } },
    }
    const req = new Request('http://t/api/settings/services', { method: 'POST', body: JSON.stringify({ name: 'New Service' }) })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
