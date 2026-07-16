import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/reviews/[id] — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, unlike its
 * sibling /api/reviews (base collection), which gates GET behind
 * 'reviews.view' and POST behind 'reviews.request' (P74's fix gated the
 * collection but missed this by-id sibling — same shape as P75's
 * clients/[id]/activity gap).
 *
 * NOT override-only: by default rbac.ts grants 'reviews.request' to
 * owner/admin/manager only — 'staff' gets neither (staff only has
 * 'reviews.view') — so this was live against the hard-coded defaults (same
 * class as P72/P76): any staff-tier member could already edit a review's
 * rating/comment/status/google_review_url with zero role check, no
 * override needed.
 *
 * FIX: requirePermission('reviews.request') — no separate 'reviews.edit'
 * permission exists in rbac.ts, and this route manages the review-request
 * lifecycle (status/requested_at/completed_at), so it reuses the same
 * write permission POST /api/reviews already uses for review management.
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

import { PUT } from './route'

function seed() {
  return {
    reviews: [
      { id: 'rev-a1', tenant_id: A, rating: 4, comment: 'Great', status: 'collected' },
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

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function putBody(body: Record<string, unknown>) {
  return new Request('http://t/api/reviews/rev-a1', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

describe('PUT /api/reviews/[id] — permission probe', () => {
  it('owner (has reviews.request) can update a review', async () => {
    const res = await PUT(putBody({ status: 'posted' }), params('rev-a1'))
    expect(res.status).toBe(200)
  })

  it("'manager' (has reviews.request per default rbac.ts) can update a review", async () => {
    tenantHolder.role = 'manager'
    const res = await PUT(putBody({ status: 'posted' }), params('rev-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: 'staff' (no reviews.request per default rbac.ts, no override needed) is forbidden from updating a review", async () => {
    tenantHolder.role = 'staff'
    const res = await PUT(putBody({ status: 'posted' }), params('rev-a1'))
    expect(res.status).toBe(403)
  })

  it("PERMISSION PROBE: a tenant that revokes 'reviews.request' from admin via a role_permissions override blocks PUT for admin", async () => {
    tenantHolder.role = 'admin'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { admin: { 'reviews.request': false } } },
    }
    const res = await PUT(putBody({ status: 'posted' }), params('rev-a1'))
    expect(res.status).toBe(403)
  })
})
