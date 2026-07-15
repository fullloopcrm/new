import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/google/reply — reviews.request gate (broad-hunt: this
 * route only called getTenantForRequest() for base tenant auth, no
 * requirePermission check, despite publicly posting a reply to a Google
 * Business review under the tenant's business identity. Matches the
 * reviews.request gate already applied to PUT/DELETE /api/admin/reviews.
 * Per rbac.ts 'staff' has reviews.view only, not reviews.request;
 * 'manager'/'admin'/'owner' all have it and must keep working.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  getValidAccessToken: vi.fn(),
  getGoogleBusiness: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  role: string
  getValidAccessToken: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getGoogleBusiness: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: {}, role: h.role }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/google', () => ({
  getValidAccessToken: (...a: unknown[]) => h.getValidAccessToken(...a),
  getGoogleBusiness: (...a: unknown[]) => h.getGoogleBusiness(...a),
}))

import { POST } from './route'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.getValidAccessToken.mockReset()
  h.getValidAccessToken.mockResolvedValue('access-token-123')
  h.getGoogleBusiness.mockReset()
  h.getGoogleBusiness.mockResolvedValue({ location_name: 'accounts/1/locations/2' })
  h.store = {
    google_reviews: [{ google_review_id: 'rev-1', tenant_id: 'tenant-A', reply: null }],
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '' }))
})

describe('POST /api/admin/google/reply — reviews.request permission', () => {
  it('rejects a staff member (no reviews.request) with 403 and never posts to Google', async () => {
    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
    expect(h.store.google_reviews.find((r) => r.google_review_id === 'rev-1')?.reply).toBeNull()
  })

  it('allows a manager (has reviews.request) to post the reply', async () => {
    h.role = 'manager'
    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(200)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('allows an admin to post the reply', async () => {
    h.role = 'admin'
    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(200)
  })

  it('allows an owner to post the reply', async () => {
    h.role = 'owner'
    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(200)
  })
})
