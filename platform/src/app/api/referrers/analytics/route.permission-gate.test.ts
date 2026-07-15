import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/referrers/analytics — referrals.view gate.
 *
 * Called getTenantForRequest() directly with zero permission check --
 * referrer earnings/click data is finance-adjacent (total_earned, referred
 * revenue). Per rbac.ts, 'staff' has no referrals.view -- any authenticated
 * tenant member, including staff, could read the tenant's full referral
 * analytics regardless of the tenant's own RBAC customization.
 */

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

const roleHolder = vi.hoisted(() => ({ role: 'owner' as string, tenantId: 'tenant-A' as string }))

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: roleHolder.tenantId,
      tenant: { id: roleHolder.tenantId },
      role: roleHolder.role,
    })),
  }
})

import { GET } from './route'

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    lead_clicks: [],
    bookings: [],
    referrers: [
      { id: 'ref-A1', tenant_id: 'tenant-A', name: 'Ref A', referral_code: 'AAAA1', total_earned: 5000 },
    ],
  }
})

describe('GET /api/referrers/analytics — referrals.view permission gate', () => {
  it('owner (has referrals.view) can read analytics', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.topReferrers).toEqual([])
  })

  it("PERMISSION PROBE: 'staff' role (no referrals permission at all) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'manager' role (has referrals.view) can read analytics", async () => {
    roleHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
