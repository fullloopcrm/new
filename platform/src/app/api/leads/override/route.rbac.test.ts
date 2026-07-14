import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * leads/override POST — permission isolation.
 *
 * BUG (fixed here): toggles manual_conversion/manual_sale on a lead_clicks row
 * but only checked getTenantForRequest() (any authenticated role), unlike its
 * siblings on the identical lead_clicks table — leads/verify PATCH and
 * leads/block POST/DELETE — which both require 'leads.view'. A 'staff' role
 * (rbac.ts grants no leads.* permission at all) could call override directly
 * even though it cannot view the leads list or use the block/verify endpoints.
 *
 * FIX: requirePermission('leads.view') on POST, matching the siblings.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
}))

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string }))
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
      tenant: { id: A },
      role: roleHolder.role,
    })),
  }
})

// Real requirePermission + real rbac run against the mocked tenant-query above,
// so a 'staff' role is denied by the ACTUAL permission table, not a stub.
import { POST } from './route'

function seed() {
  return {
    lead_clicks: [
      { id: 'lc-1', tenant_id: A, manual_conversion: false, manual_sale: false },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  roleHolder.role = 'owner'
})

function override(id: string, type: string) {
  return POST(new Request('http://t/api/leads/override', { method: 'POST', body: JSON.stringify({ id, type }) }))
}

describe('leads/override POST — permission isolation', () => {
  it('positive control: owner (has leads.view) can toggle conversion', async () => {
    const res = await override('lc-1', 'conversion')
    expect(res.status).toBe(200)
    expect(h.seed.lead_clicks[0].manual_conversion).toBe(true)
  })

  it("permission probe: 'staff' (no leads.view) is denied 403, no write", async () => {
    roleHolder.role = 'staff'
    const res = await override('lc-1', 'conversion')
    expect(res.status).toBe(403)
    expect(h.seed.lead_clicks[0].manual_conversion).toBe(false)
  })

  it("manager (has leads.view) can toggle sale", async () => {
    roleHolder.role = 'manager'
    const res = await override('lc-1', 'sale')
    expect(res.status).toBe(200)
    expect(h.seed.lead_clicks[0].manual_sale).toBe(true)
  })
})
