import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/import-clients — permission gate.
 *
 * BUG (fixed here): this handler's own header comment says "Admin-only" but
 * the code only called getTenantForRequest() (proves tenant membership at
 * ANY role) with zero permission check — the documented restriction was
 * never enforced. No frontend page calls this route (confirmed via repo
 * grep), but that doesn't make it safe: any authenticated tenant member can
 * still POST to it directly. By default rbac.ts grants 'clients.create' to
 * owner/admin/manager only -- 'staff' gets only 'clients.view' -- so any
 * staff-tier member could already bulk-insert arbitrary client records
 * (each with an auto-generated PIN), with zero role check, no override
 * needed -- same class as P70/P76-P82.
 *
 * FIX: requirePermission('clients.create') on POST, matching the permission
 * already used by the single-client POST /api/clients route.
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

import { POST } from './route'

function seed() {
  return { clients: [] as Record<string, unknown>[] }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function post(body: unknown) {
  return POST(new Request('http://t/api/import-clients', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/import-clients — permission probe', () => {
  it('owner (has clients.create) can bulk-import clients', async () => {
    const res = await post({ clients: [{ name: 'Alice' }] })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(1)
  })

  it("'manager' (has clients.create per default rbac.ts) can bulk-import clients", async () => {
    tenantHolder.role = 'manager'
    const res = await post({ clients: [{ name: 'Bob' }] })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(1)
  })

  it("PERMISSION PROBE: 'staff' (no clients.create per default rbac.ts, no override needed) is forbidden from bulk-importing clients", async () => {
    tenantHolder.role = 'staff'
    const res = await post({ clients: [{ name: 'Eve' }] })
    expect(res.status).toBe(403)
    expect(h.seed.clients).toHaveLength(0)
  })

  it("PERMISSION PROBE: a tenant that revokes 'clients.create' from admin via a role_permissions override blocks POST for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'clients.create': false } } },
    }
    const res = await post({ clients: [{ name: 'Mallory' }] })
    expect(res.status).toBe(403)
    expect(h.seed.clients).toHaveLength(0)
  })
})
