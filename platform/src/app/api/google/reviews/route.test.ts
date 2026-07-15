import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * POST/PUT /api/google/reviews — missing-authz. Only checked
 * getTenantForRequest() (any authenticated role), unlike the sibling
 * /api/admin/reviews route which gates the same class of mutation
 * (approve/reject/feature/delete a review) on reviews.request. Replying to a
 * review publishes live to the tenant's Google Business Profile, and
 * toggling auto-reply controls whether AI replies get auto-published --
 * 'staff' (reviews.view only, no reviews.request per rbac.ts) could do
 * either. Fixed to require reviews.request on both, matching the sibling
 * route's established convention.
 *
 * GET /api/google/reviews — same missing-authz class: only checked
 * getTenantForRequest(). Every default role happens to include reviews.view,
 * so this was invisible day-to-day, but rbac.ts lets a tenant override
 * per-role permissions (tenants.selena_config.role_permissions) and that
 * override was silently ignored here. Fixed with requirePermission
 * ('reviews.view'), matching the notifications route's established
 * convention of enforcing the tenant's actual configured permission set.
 */

const roleHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenantId: 'tenant-A' as string,
  overrides: null as Record<string, unknown> | null,
}))

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
      tenant: {
        id: roleHolder.tenantId,
        selena_config: roleHolder.overrides ? { role_permissions: roleHolder.overrides } : null,
      },
      role: roleHolder.role,
    })),
  }
})

const review = { id: 'rev-1', tenant_id: 'tenant-A', reviewer_name: 'Alex', rating: 5, comment: 'Great!', google_review_id: 'g-1' }

const updateEq = vi.hoisted(() => vi.fn(async () => ({ error: null })))
const upsertFn = vi.hoisted(() => vi.fn(async () => ({ error: null })))
const selectReviews = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'google_reviews') {
        return {
          // GET's chain terminates on .limit(); POST's on .single() after a
          // second .eq(). Both share the same .eq()-returns-self chain.
          select: (...args: unknown[]) => {
            selectReviews(...args)
            const chain = {
              eq: () => chain,
              order: () => chain,
              limit: async () => ({ data: [review] }),
              single: async () => ({ data: review }),
            }
            return chain
          },
          update: () => ({ eq: updateEq }),
        }
      }
      if (table === 'tenant_settings') {
        return {
          select: () => ({ eq: () => ({ single: async () => ({ data: { google_auto_reply: false } }) }) }),
          upsert: upsertFn,
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

const getGoogleBusiness = vi.hoisted(() => vi.fn(async () => ({ location_name: 'accounts/1/locations/2' })))
vi.mock('@/lib/google', () => ({ getGoogleBusiness }))

const generateReviewReply = vi.hoisted(() => vi.fn(async () => 'AI reply'))
const postReviewReply = vi.hoisted(() => vi.fn(async () => true))
vi.mock('@/lib/google-reviews', () => ({ generateReviewReply, postReviewReply }))

import { GET, POST, PUT } from './route'

beforeEach(() => {
  roleHolder.role = 'owner'
  roleHolder.tenantId = 'tenant-A'
  roleHolder.overrides = null
  postReviewReply.mockClear()
  generateReviewReply.mockClear()
  upsertFn.mockClear()
  selectReviews.mockClear()
})

const req = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/google/reviews — permission gate', () => {
  it('owner can post a manual reply', async () => {
    const res = await POST(req({ reviewId: 'rev-1', reply: 'Thank you!' }))
    expect(res.status).toBe(200)
    expect(postReviewReply).toHaveBeenCalledWith('tenant-A', 'accounts/1/locations/2/reviews/g-1', 'Thank you!')
  })

  it("PERMISSION PROBE: 'staff' role (reviews.view only, no reviews.request) is forbidden and never posts a reply", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req({ reviewId: 'rev-1', reply: 'hijacked reply' }))
    expect(res.status).toBe(403)
    expect(postReviewReply).not.toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' role is forbidden even for the AI-draft-generate branch", async () => {
    roleHolder.role = 'staff'
    const res = await POST(req({ reviewId: 'rev-1', generateAI: true }))
    expect(res.status).toBe(403)
    expect(generateReviewReply).not.toHaveBeenCalled()
  })
})

describe('PUT /api/google/reviews — permission gate', () => {
  it('owner can toggle auto-reply', async () => {
    const res = await PUT(req({ autoReply: true }))
    expect(res.status).toBe(200)
    expect(upsertFn).toHaveBeenCalled()
  })

  it("PERMISSION PROBE: 'staff' role is forbidden and never flips the setting", async () => {
    roleHolder.role = 'staff'
    const res = await PUT(req({ autoReply: true }))
    expect(res.status).toBe(403)
    expect(upsertFn).not.toHaveBeenCalled()
  })
})

describe('GET /api/google/reviews — permission gate', () => {
  it('owner can list reviews', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(selectReviews).toHaveBeenCalled()
  })

  it('staff (has reviews.view by default) can list reviews', async () => {
    roleHolder.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: rejects staff with 403 once the tenant overrides reviews.view off for staff, and never reads", async () => {
    roleHolder.role = 'staff'
    roleHolder.overrides = { staff: { 'reviews.view': false } }
    const res = await GET()
    expect(res.status).toBe(403)
    expect(selectReviews).not.toHaveBeenCalled()
  })

  it('owner is never affected by a staff override (owner bypasses permission checks)', async () => {
    roleHolder.role = 'owner'
    roleHolder.overrides = { staff: { 'reviews.view': false } }
    const res = await GET()
    expect(res.status).toBe(200)
  })
})
