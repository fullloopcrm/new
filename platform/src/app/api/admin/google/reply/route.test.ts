import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * POST /api/admin/google/reply — first route-level regression test (P1/W1
 * O13 sweep). Posts a reply to a Google Business review via the Google API,
 * then records it on the tenant-scoped `google_reviews` row. Zero prior
 * coverage of the Google-API-failure paths or of tenant scoping on the
 * follow-up DB write.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  getValidAccessToken: vi.fn(),
  getGoogleBusiness: vi.fn(),
})) as unknown as FakeStoreHandle & {
  tenantId: string
  getValidAccessToken: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
  getGoogleBusiness: ReturnType<typeof import('vitest').vi.fn<(...args: unknown[]) => unknown>>
}

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId }),
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
import { AuthError } from '@/lib/tenant-query'

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.getValidAccessToken.mockReset()
  h.getValidAccessToken.mockResolvedValue('access-token-123')
  h.getGoogleBusiness.mockReset()
  h.getGoogleBusiness.mockResolvedValue({ location_name: 'accounts/1/locations/2' })
  h.store = {
    google_reviews: [
      { google_review_id: 'rev-1', tenant_id: 'tenant-A', reply: null },
      { google_review_id: 'rev-shared', tenant_id: 'tenant-B', reply: null },
    ],
  }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '' }))
})

describe('POST /api/admin/google/reply — request validation', () => {
  it('propagates an AuthError from getTenantForRequest unchanged', async () => {
    const tenantQuery = await import('@/lib/tenant-query')
    vi.spyOn(tenantQuery, 'getTenantForRequest').mockRejectedValueOnce(new AuthError('Unauthorized', 401))

    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(401)
  })

  it('rejects a missing reviewId with 400', async () => {
    const res = await POST(postReq({ reply: 'Thanks!' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'reviewId and reply are required' })
  })

  it('rejects a whitespace-only reply with 400', async () => {
    const res = await POST(postReq({ reviewId: 'rev-1', reply: '   ' }))

    expect(res.status).toBe(400)
  })
})

describe('POST /api/admin/google/reply — Google connection gates', () => {
  it('returns 401 when the tenant has no valid Google access token', async () => {
    h.getValidAccessToken.mockResolvedValueOnce(null)

    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: 'Not connected to Google' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when the tenant has no Google business location configured', async () => {
    h.getGoogleBusiness.mockResolvedValueOnce({ location_name: null })

    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({ error: 'No location configured' })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('POST /api/admin/google/reply — Google API failure handling', () => {
  it('returns 500 and never records the reply when the Google API call fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, text: async () => 'quota exceeded' }))

    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({ error: 'Failed to post reply' })
    expect(h.store.google_reviews.find((r) => r.google_review_id === 'rev-1')?.reply).toBeNull()
  })

  it('returns 500 when the fetch itself throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const res = await POST(postReq({ reviewId: 'rev-1', reply: 'Thanks!' }))

    expect(res.status).toBe(500)
  })
})

describe('POST /api/admin/google/reply — success', () => {
  it('posts the trimmed reply to the correct Google API URL and records it on the review row', async () => {
    const res = await POST(postReq({ reviewId: 'rev-1', reply: '  Thanks for the feedback!  ' }))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ success: true })

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://mybusiness.googleapis.com/v4/accounts/1/locations/2/reviews/rev-1/reply')
    expect(init.method).toBe('PUT')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-token-123')
    expect(JSON.parse(init.body as string)).toEqual({ comment: 'Thanks for the feedback!' })

    expect(h.store.google_reviews.find((r) => r.google_review_id === 'rev-1')?.reply).toBe('Thanks for the feedback!')
  })

  it("never records the reply against another tenant's review row sharing the same google_review_id", async () => {
    h.store.google_reviews.push({ google_review_id: 'rev-shared', tenant_id: 'tenant-A', reply: null })

    await POST(postReq({ reviewId: 'rev-shared', reply: 'Thanks!' }))

    const tenantARow = h.store.google_reviews.find((r) => r.google_review_id === 'rev-shared' && r.tenant_id === 'tenant-A')
    const tenantBRow = h.store.google_reviews.find((r) => r.google_review_id === 'rev-shared' && r.tenant_id === 'tenant-B')
    expect(tenantARow?.reply).toBe('Thanks!')
    expect(tenantBRow?.reply).toBeNull()
  })
})
