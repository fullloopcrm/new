import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/admin/analytics/live-feed — permission gate.
 *
 * BUG (fixed here): only called getTenantForRequest() (proves tenant
 * membership at ANY role) with zero permission check, and returns raw
 * visitor tracking data (page, referrer, device, time-on-page) for every
 * recent site visit. Its sibling on the exact same `lead_clicks` table,
 * GET /api/leads/feed, already gates behind requirePermission('leads.view')
 * — rbac.ts grants leads.view to owner/admin/manager, not staff. No live
 * frontend caller was found for this route (unlike leads/feed, which IS
 * wired up) — same "fully executes for any authenticated tenant member,
 * just not wired to a live caller" shape as P83/P89/P90/P91, worth closing
 * rather than leaving as a reachable unguarded endpoint.
 *
 * FIX: requirePermission('leads.view') on GET, matching leads/feed.
 */

const A = 'tid-livefeed-rbac-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: {} as Record<string, unknown>,
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
    lead_clicks: [
      { id: 'lc-a1', tenant_id: A, action: 'visit', domain: 'a.example', page: '/', created_at: '2026-07-03T00:00:00Z', user_agent: 'Mozilla/5.0' },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function get() {
  return GET()
}

describe('GET /api/admin/analytics/live-feed — permission probe', () => {
  it('owner (has leads.view) can load the live feed', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.visits).toHaveLength(1)
  })

  it('manager (has leads.view per rbac.ts) can load the live feed', async () => {
    tenantHolder.role = 'manager'
    const res = await get()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no leads.view) is forbidden", async () => {
    tenantHolder.role = 'staff'
    const res = await get()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.visits).toBeUndefined()
  })

  it("PERMISSION PROBE: a tenant override granting leads.view to staff allows GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'leads.view': true } } },
    }
    const res = await get()
    expect(res.status).toBe(200)
  })
})
