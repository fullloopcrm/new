import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/clients/analytics — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, despite
 * returning per-client LTV plus lifecycle/churn metrics derived from
 * `bookings` — the same class of data /api/clients gates behind
 * requirePermission('clients.view'). Every default role is granted
 * 'clients.view', so this was invisible against the hard-coded defaults —
 * but a tenant can revoke 'clients.view' from a role via a role_permissions
 * override, and this endpoint silently ignored that override.
 *
 * FIX: requirePermission('clients.view') on GET, matching /api/clients.
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

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ active_client_threshold_days: 30, at_risk_threshold_days: 90 })),
}))

import { GET } from './route'

function seed() {
  return {
    bookings: [
      { client_id: 'cli-a1', price: 100, start_time: new Date().toISOString(), status: 'completed', clients: { name: 'Ann' } },
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

describe('GET /api/clients/analytics — permission probe', () => {
  it('owner (has clients.view) can read client analytics', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'clients.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'clients.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
