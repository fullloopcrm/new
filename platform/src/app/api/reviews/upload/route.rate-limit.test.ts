/**
 * /api/reviews/upload is reached via tenant subdomain/custom-domain rewrite in
 * middleware.ts, which happens BEFORE the Clerk auth check ('Tenant subdomain
 * routing (runs before Clerk auth)' / 'Custom domain routing (runs before
 * Clerk auth)') -- it never gets the /api/reviews Clerk-bypass-cookie gate
 * that applies only on the main host. Combined with its own doc comment
 * ("Public image/video upload for client review submissions") this route is
 * genuinely public and unauthenticated, accepting up to 100MB video per
 * request with no rate limiting at all -- worse than the sibling public-upload
 * route (25MB, now rate-limited). Fixed with the same rateLimitDb pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test-tenant' }),
}))

const rateLimitDb = vi.fn()
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: (...args: unknown[]) => rateLimitDb(...args) }))

const uploadedPaths: string[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn().mockImplementation((path: string) => {
          uploadedPaths.push(path)
          return Promise.resolve({ error: null })
        }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  },
}))

function fakeRequest(fields: Record<string, unknown>, ip = '1.2.3.4') {
  return {
    headers: { get: (key: string) => (key === 'x-forwarded-for' ? ip : null) },
    formData: async () => ({
      get: (key: string) => fields[key] ?? null,
    }),
  } as unknown as Parameters<typeof import('./route').POST>[0]
}

function fakeFile(name: string, type = 'image/jpeg', size = 100) {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
  }
}

beforeEach(() => {
  uploadedPaths.length = 0
  rateLimitDb.mockReset()
})

describe('reviews/upload — rate limiting', () => {
  it('rejects with 429 once the per-tenant+ip bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValue({ allowed: false, remaining: 0 })
    const { POST } = await import('./route')
    const req = fakeRequest({ file: fakeFile('photo.jpg') })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(uploadedPaths).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith(
      expect.stringContaining('reviews_upload:tenant-1:1.2.3.4'),
      60,
      10 * 60 * 1000
    )
  })

  it('allows the upload through when under the limit', async () => {
    rateLimitDb.mockResolvedValue({ allowed: true, remaining: 59 })
    const { POST } = await import('./route')
    const req = fakeRequest({ file: fakeFile('photo.jpg') })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadedPaths).toHaveLength(1)
  })
})
