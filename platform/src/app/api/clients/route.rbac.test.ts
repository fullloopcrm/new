import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/clients — permission gate.
 *
 * BUG (fixed here): the list handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'clients.view' specifically to gate this data and the
 * sibling POST handler on this same file already requires requirePermission(
 * 'clients.create'). Every default role (owner/admin/manager/staff) is
 * granted 'clients.view', so this was invisible against the hard-coded
 * defaults — but a tenant can revoke 'clients.view' from a role via a
 * role_permissions override, and GET silently ignored that override,
 * letting a locked-out member still read every client's PII (name, email,
 * phone, address) via direct API call.
 *
 * FIX: requirePermission('clients.view') on GET, matching the family
 * convention already used on PUT/DELETE /api/clients/[id].
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
    clients: [
      { id: 'cli-a1', tenant_id: A, name: 'Ann', email: 'ann@x.com', phone: null, status: 'active', created_at: '2020-01-01' },
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

describe('GET /api/clients — permission probe', () => {
  it('owner (has clients.view) can list clients', async () => {
    const res = await GET(new NextRequest('http://t/api/clients'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'clients.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'clients.view': false } } },
    }
    const res = await GET(new NextRequest('http://t/api/clients'))
    expect(res.status).toBe(403)
  })
})
