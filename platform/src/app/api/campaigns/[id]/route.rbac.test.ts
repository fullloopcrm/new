import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/PUT/DELETE /api/campaigns/[id] — permission gate.
 *
 * BUG (fixed here): all three handlers only called getTenantForRequest()
 * (proves tenant membership at ANY role) with zero permission check, while
 * the sibling collection routes (`POST /api/campaigns`, `POST .../send`)
 * already require requirePermission('campaigns.create' / 'campaigns.send').
 * This was a LIVE bug against the hard-coded role defaults, not just a
 * per-tenant override edge case: 'manager' is granted 'campaigns.view' but
 * NOT 'campaigns.create' by default (rbac.ts), meaning a manager can see the
 * campaigns list/create nothing — yet could still hit PUT/DELETE
 * /api/campaigns/[id] directly and edit or delete any campaign, bypassing
 * the write-permission boundary the tenant's own default role config
 * already draws for POST.
 *
 * FIX: requirePermission('campaigns.view') on GET, requirePermission(
 * 'campaigns.create') on PUT/DELETE (campaigns has no distinct edit/delete
 * permission — matches the create-gated POST convention used elsewhere,
 * e.g. GET /api/deals -> sales.view, PUT/DELETE /api/deals -> sales.edit).
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

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { GET, PUT, DELETE } from './route'

function seed() {
  return {
    campaigns: [
      { id: 'camp-1', tenant_id: A, name: 'Spring Promo', type: 'email', status: 'draft' },
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

const params = () => Promise.resolve({ id: 'camp-1' })

describe('GET /api/campaigns/[id] — permission probe', () => {
  it('owner (has campaigns.view) can view a campaign', async () => {
    const res = await GET(new Request('http://t/api/campaigns/camp-1'), { params: params() })
    expect(res.status).toBe(200)
  })

  it("'staff' (lacks campaigns.view per default rbac.ts) is blocked", async () => {
    tenantHolder.role = 'staff'
    const res = await GET(new Request('http://t/api/campaigns/camp-1'), { params: params() })
    expect(res.status).toBe(403)
  })
})

describe('PUT /api/campaigns/[id] — permission probe', () => {
  it('owner (has campaigns.create) can edit a campaign', async () => {
    const res = await PUT(
      new Request('http://t/api/campaigns/camp-1', { method: 'PUT', body: JSON.stringify({ name: 'Updated' }) }),
      { params: params() }
    )
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has campaigns.view but NOT campaigns.create per default rbac.ts) is blocked from editing", async () => {
    tenantHolder.role = 'manager'
    const res = await PUT(
      new Request('http://t/api/campaigns/camp-1', { method: 'PUT', body: JSON.stringify({ name: 'Updated' }) }),
      { params: params() }
    )
    expect(res.status).toBe(403)
  })
})

describe('DELETE /api/campaigns/[id] — permission probe', () => {
  it('owner (has campaigns.create) can delete a campaign', async () => {
    const res = await DELETE(new Request('http://t/api/campaigns/camp-1', { method: 'DELETE' }), { params: params() })
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'manager' (has campaigns.view but NOT campaigns.create per default rbac.ts) is blocked from deleting", async () => {
    tenantHolder.role = 'manager'
    const res = await DELETE(new Request('http://t/api/campaigns/camp-1', { method: 'DELETE' }), { params: params() })
    expect(res.status).toBe(403)
  })
})
