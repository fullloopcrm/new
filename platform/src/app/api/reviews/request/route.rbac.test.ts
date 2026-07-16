import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/reviews/request — permission gate.
 *
 * BUG (fixed here): called only getTenantForRequest() (proves tenant
 * membership at ANY role) with zero permission check, even though the
 * sibling google/reviews.ts and admin/reviews.ts routes both gate their
 * review-request actions behind reviews.request, and rbac.ts grants 'staff'
 * reviews.view but NOT reviews.request. Live bug against the hard-coded
 * defaults: any staff-tier member could already trigger a real
 * email/SMS review-request send to a client with zero role check.
 *
 * FIX: requirePermission('reviews.request'), matching the family's own
 * convention already used on google/reviews.ts and admin/reviews.ts.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a', name: 'Test Co' } as Record<string, unknown>,
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

vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => {}) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { POST } from './route'

function seed() {
  return {
    clients: [{ id: 'client-a1', tenant_id: A, name: 'Ann Client', email: 'ann@x.com', phone: null }],
    reviews: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A, name: 'Test Co' }
})

describe('POST /api/reviews/request — permission probe', () => {
  const body = { client_id: 'client-a1' }

  it('owner (has reviews.request) can send a review request', async () => {
    const res = await POST(new Request('http://t/api/reviews/request', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(200)
  })

  it('manager (has reviews.request per default rbac.ts) can send a review request', async () => {
    tenantHolder.role = 'manager'
    const res = await POST(new Request('http://t/api/reviews/request', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no reviews.request per default rbac.ts, no override needed) is forbidden from sending a review request", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(new Request('http://t/api/reviews/request', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'reviews.request' from manager via a role_permissions override blocks the send for manager", async () => {
    tenantHolder.role = 'manager'
    tenantHolder.tenant = {
      id: A,
      name: 'Test Co',
      selena_config: { role_permissions: { manager: { 'reviews.request': false } } },
    }
    const res = await POST(new Request('http://t/api/reviews/request', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(403)
  })
})
