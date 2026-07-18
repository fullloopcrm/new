// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/reviews/upload is the public, unauthenticated image/video
 * upload for client review submissions -- no auth, and videos are accepted
 * up to 100MB. Unlike its sibling public upload route (cleaners/upload,
 * already IP-rate-limited via rateLimitDb), this one had zero cap: a
 * scripted flood of repeated 100MB video uploads could run up real storage
 * cost with no server-side gate at all. Fixed with the same
 * rateLimitDb(`reviews-upload:${tenantId}:${ip}`) bucket convention.
 */

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const uploadMock = vi.fn(async (..._args: unknown[]) => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => uploadMock(...args),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  },
}))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tid-a' }),
}))

function fakeRequest(file: File, ip = '9.9.9.9') {
  const formData = new FormData()
  formData.set('file', file)
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    formData: async () => formData,
  } as unknown as Request
}

beforeEach(() => {
  rateLimitDb.mockReset()
  uploadMock.mockClear()
})

describe('POST /api/reviews/upload — rate limiting', () => {
  it('rejects with 429 once the per-tenant-IP bucket is exhausted, before touching storage', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(fakeRequest(file))
    expect(res.status).toBe(429)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(rateLimitDb).toHaveBeenCalledWith('reviews-upload:tid-a:9.9.9.9', 3, 10 * 60 * 1000)
  })

  it('passes through to storage when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 2 })
    const { POST } = await import('./route')
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const res = await POST(fakeRequest(file))
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalled()
  })
})
