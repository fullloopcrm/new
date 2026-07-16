import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET/POST /api/reviews — permission gate.
 *
 * BUG (fixed here): both handlers only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, even though
 * every sibling review route already enforces reviews.view/reviews.request —
 * google/reviews/route.ts (GET reviews.view, POST reviews.request) and
 * admin/reviews/route.ts (GET reviews.view, POST reviews.request) — this
 * base dashboard collection route was missed. By default rbac.ts grants
 * 'staff' reviews.view but NOT reviews.request, so GET is override-only
 * (staff already passes by default) but POST was a live bug against the
 * hard-coded defaults: any staff-tier member could already create review
 * records with zero role check, no override needed.
 *
 * FIX: requirePermission('reviews.view') on GET, requirePermission(
 * 'reviews.request') on POST, matching the family's own convention.
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

import { GET, POST } from './route'

function seed() {
  return {
    reviews: [
      { id: 'rev-a1', tenant_id: A, client_id: null, rating: 5, comment: 'Great', created_at: '2026-01-01' },
    ],
    clients: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

describe('GET /api/reviews — permission probe', () => {
  it('owner (has reviews.view) can list reviews', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("'staff' (has reviews.view per default rbac.ts) can list reviews", async () => {
    tenantHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'reviews.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'reviews.view': false } } },
    }
    const res = await GET()
    expect(res.status).toBe(403)
  })
})

describe('POST /api/reviews — permission probe', () => {
  const body = { rating: 5, comment: 'Nice job' }

  it('owner (has reviews.request) can create a review', async () => {
    const res = await POST(new Request('http://t/api/reviews', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(201)
  })

  it('manager (has reviews.request per default rbac.ts) can create a review', async () => {
    tenantHolder.role = 'manager'
    const res = await POST(new Request('http://t/api/reviews', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(201)
  })

  it("PERMISSION PROBE: 'staff' (no reviews.request per default rbac.ts, no override needed) is forbidden from creating a review", async () => {
    tenantHolder.role = 'staff'
    const res = await POST(new Request('http://t/api/reviews', { method: 'POST', body: JSON.stringify(body) }))
    expect(res.status).toBe(403)
  })
})
