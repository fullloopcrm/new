import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/security/events — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts already defines 'audit.view' for this exact class of resource
 * (login/password-change/member-removed/IP-address history) and gates the
 * sibling `/api/audit` route (P76) behind it. By default rbac.ts grants
 * 'audit.view' to owner/admin only -- 'manager' and 'staff' get neither --
 * so this was a live bug against the hard-coded defaults: any manager- or
 * staff-tier member could already read the tenant's full security-events
 * feed (logins, password changes, member removals, IP addresses) with zero
 * role check, no override needed.
 *
 * FIX: requirePermission('audit.view') on GET, matching /api/audit.
 */

const A = 'tid-a'
const B = 'tid-b'

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

function seed() {
  return {
    security_events: [
      { id: 'ev-a1', tenant_id: A, type: 'login', created_at: '2026-07-02T00:00:00Z' },
      { id: 'ev-b1', tenant_id: B, type: 'login_failed', created_at: '2026-07-03T00:00:00Z' },
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

describe('GET /api/security/events — permission probe', () => {
  it('owner (has audit.view) can read the security-events feed', async () => {
    const res = await GET(new Request('http://t/api/security/events'))
    expect(res.status).toBe(200)
  })

  it("'admin' (has audit.view per default rbac.ts) can read the security-events feed", async () => {
    tenantHolder.role = 'admin'
    const res = await GET(new Request('http://t/api/security/events'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (no audit.view per default rbac.ts, no override needed) is forbidden from reading the security-events feed", async () => {
    tenantHolder.role = 'manager'
    const res = await GET(new Request('http://t/api/security/events'))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'staff' (no audit.view per default rbac.ts, no override needed) is forbidden from reading the security-events feed", async () => {
    tenantHolder.role = 'staff'
    const res = await GET(new Request('http://t/api/security/events'))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'audit.view' from admin via a role_permissions override blocks GET for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'audit.view': false } } },
    }
    const res = await GET(new Request('http://t/api/security/events'))
    expect(res.status).toBe(403)
  })
})
