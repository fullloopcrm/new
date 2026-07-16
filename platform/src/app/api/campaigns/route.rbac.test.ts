import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/campaigns — permission gate.
 *
 * BUG (fixed here): the list handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though the
 * sibling POST (create) handler on this same file already requires
 * requirePermission('campaigns.create') and campaigns.view exists in rbac.ts
 * specifically to gate this data. By default 'staff' is NOT granted
 * campaigns.view, but with zero check any authenticated tenant member could
 * read every campaign (name/subject/body/recipient_filter) regardless of
 * role or per-tenant override.
 *
 * FIX: requirePermission('campaigns.view') on GET, matching the write side's
 * existing requirePermission('campaigns.create') on POST.
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

function seed() {
  return {
    campaigns: [
      { id: 'camp-1', tenant_id: A, name: 'Spring Promo', type: 'email', status: 'draft', created_at: '2026-01-01' },
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

describe('GET /api/campaigns — permission probe', () => {
  it('owner (has campaigns.view) can list campaigns', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'staff' (lacks campaigns.view per default rbac.ts) is blocked from listing campaigns", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'campaigns.view' from manager via a role_permissions override blocks GET /api/campaigns for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'campaigns.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
