import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/pipeline — permission gate.
 *
 * BUG (fixed here): the handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though it
 * returns the exact same shape of data as GET /api/deals (active deals +
 * client PII — name/email/phone — + revenue forecast/stage totals), which
 * IS gated behind requirePermission('sales.view'). By default every role
 * (including staff) has 'sales.view', so this was invisible against the
 * hard-coded defaults — but a tenant can revoke 'sales.view' from a role via
 * tenants.selena_config.role_permissions, and GET /api/deals already
 * honored that override while GET /api/pipeline silently ignored it,
 * letting any authenticated member of the tenant see the sales pipeline
 * (including client PII and $ forecasts) no matter how the tenant had
 * configured its own permissions.
 *
 * FIX: requirePermission('sales.view'), matching GET /api/deals exactly.
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

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so both the hard-coded role defaults AND a per-tenant override are the
// ACTUAL permission logic, not a stub.
import { GET } from './route'

function seed() {
  return {
    deals: [
      { id: 'deal-1', tenant_id: A, status: 'active', stage: 'new', value_cents: 100000, probability: 50, follow_up_at: null, expected_close_date: null, clients: { id: 'cl-a', name: 'Client A' } },
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

function req() {
  return new Request('http://t/api/pipeline')
}

describe('GET /api/pipeline — permission probe', () => {
  it('owner (has sales.view) can view the pipeline', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
  })

  it("'staff' (has sales.view per default rbac.ts) can view the pipeline", async () => {
    tenantHolder.role = 'staff'
    const res = await GET(req())
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'sales.view' from staff via a role_permissions override blocks GET /api/pipeline for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'sales.view': false } } },
    }
    const res = await GET(req())
    expect(res.status).toBe(403)
  })
})
