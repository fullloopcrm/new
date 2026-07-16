import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/referrals — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * rbac.ts defines 'referrals.view'/'referrals.create' specifically for this
 * resource and every sibling referral-money route already enforces them —
 * referral-commissions/route.ts POST/PUT (referrals.create/referrals.payout),
 * referrals/[id]/route.ts PUT (referrals.payout), referrers/analytics/route.ts
 * GET (referrals.view). By default rbac.ts grants 'staff' NEITHER
 * referrals.view NOR referrals.create (and 'manager' gets referrals.view but
 * not referrals.create) — so unlike the override-only gaps fixed in prior
 * rounds, this was a live bug against the hard-coded defaults: any staff-tier
 * member could already list every referrer (name/email/phone/commission_rate)
 * and create new referral codes with zero role check, no override needed.
 *
 * FIX: requirePermission('referrals.view') on GET, requirePermission(
 * 'referrals.create') on POST, matching the family's own convention.
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

import { GET, POST } from './route'

function seed() {
  return {
    referrals: [
      { id: 'ref-a1', tenant_id: A, name: 'Ann Referrer', email: 'ann@x.com', referral_code: 'ANN123', created_at: '2026-01-01' },
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

describe('GET /api/referrals — permission probe', () => {
  it('owner (has referrals.view) can list referrals', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'manager' (has referrals.view per default rbac.ts) can list referrals", async () => {
    tenantHolder.role = 'manager'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no referrals.view per default rbac.ts, no override needed) is forbidden from listing referrals", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'referrals.view' from manager via a role_permissions override blocks GET for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { manager: { 'referrals.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/referrals — permission probe', () => {
  const body = { name: 'New Referrer', email: 'new@x.com' }

  it('owner (has referrals.create) can create a referral', async () => {
    const res = await POST(new Request('http://t/api/referrals', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(201)
  })

  it("PERMISSION PROBE: 'manager' (has referrals.view but NOT referrals.create per default rbac.ts) is forbidden from creating a referral", async () => {
    tenantHolder.role = 'manager'
    const res = await POST(new Request('http://t/api/referrals', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: 'staff' (no referrals.create per default rbac.ts, no override needed) is forbidden from creating a referral", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(new Request('http://t/api/referrals', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(403)
  })
})
