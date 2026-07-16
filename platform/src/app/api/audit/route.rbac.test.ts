import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/audit — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'audit.view' specifically for this resource. By default
 * rbac.ts grants 'audit.view' to owner/admin only -- 'manager' and 'staff'
 * get neither -- so unlike the override-only gaps fixed in prior rounds,
 * this was a live bug against the hard-coded defaults: any manager- or
 * staff-tier member could already read the full tenant audit log (every
 * user action recorded for the tenant) with zero role check, no override
 * needed.
 *
 * FIX: requirePermission('audit.view') on GET, matching the permission
 * rbac.ts already defines for this exact resource.
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

import { GET } from './route'
import { NextRequest } from 'next/server'

function seed() {
  return {
    audit_logs: [
      { id: 'log-a1', tenant_id: A, entity_type: 'booking', created_at: '2026-07-01T00:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('GET /api/audit — permission probe', () => {
  it('owner (has audit.view) can read the audit log', async () => {
    const res = await GET(new NextRequest('http://t/api/audit'))
    expect(res.status).toBe(200)
  })

  it("'admin' (has audit.view per default rbac.ts) can read the audit log", async () => {
    tenantHolder.role = 'admin'
    const res = await GET(new NextRequest('http://t/api/audit'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no audit.view per default rbac.ts, no override needed) is forbidden from reading the audit log", async () => {
    tenantHolder.role = 'manager'
    const res = await GET(new NextRequest('http://t/api/audit'))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'staff' (no audit.view per default rbac.ts, no override needed) is forbidden from reading the audit log", async () => {
    tenantHolder.role = 'staff'
    const res = await GET(new NextRequest('http://t/api/audit'))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'audit.view' from admin via a role_permissions override blocks GET for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'audit.view': false } } },
    }
    const res = await GET(new NextRequest('http://t/api/audit'))
    expect(res.status).toBe(403)
  })
})
