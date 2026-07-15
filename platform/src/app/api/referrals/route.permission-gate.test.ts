import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET/POST /api/referrals — referrals.view / referrals.create gate.
 *
 * Both called getTenantForRequest() directly with zero permission check.
 * Per rbac.ts, 'staff' has neither referrals.view nor referrals.create --
 * any authenticated tenant member, including staff, could list every
 * referral code/client name/commission_rate (GET) or mint arbitrary
 * referral codes and commission rates (POST) regardless of the tenant's
 * own RBAC customization.
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

import { GET, POST } from './route'

beforeEach(() => {
  h.seq = 0
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  h.store = {
    referrals: [
      { id: 'refl-A1', tenant_id: 'tenant-A', name: 'Pat Referrer', referral_code: 'ABC123', commission_rate: 0.1 },
    ],
  }
})

function postReq(body: Record<string, unknown>): Request {
  return new Request('http://x/api/referrals', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET /api/referrals — referrals.view permission gate', () => {
  it('owner (has referrals.view) can list referrals', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.referrals).toHaveLength(1)
  })

  it("PERMISSION PROBE: 'staff' role (no referrals permission at all) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/referrals — referrals.create permission gate', () => {
  it('owner (has referrals.create) can create a referral', async () => {
    const res = await POST(postReq({ name: 'New Referrer', email: 'r@example.com' }))
    expect(res.status).toBe(201)
  })

  it("PERMISSION PROBE: 'staff' role (no referrals permission at all) is forbidden", async () => {
    roleHolder.role = 'staff'
    const res = await POST(postReq({ name: 'New Referrer', email: 'r@example.com' }))
    expect(res.status).toBe(403)
  })
})
