/**
 * reviews/upload/route.ts — missing rate limiting.
 *
 * Fully anonymous, unauthenticated endpoint (tenant resolved from a signed
 * host header, not a session) accepting up to 100MB video files, with zero
 * throttling of any kind — worse than the sibling public-upload route
 * (25MB cap, already rate-limited at 60/10min via rateLimitDb).
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))

const rateLimitDb = vi.hoisted(() => vi.fn())
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const uploadCalls: Array<{ path: string }> = []
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: (path: string) => {
          uploadCalls.push({ path })
          return Promise.resolve({ data: { path }, error: null })
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.com/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

function fakeFile(name: string, type = 'image/jpeg', size = 200) {
  return { name, type, size, arrayBuffer: async () => new ArrayBuffer(size) }
}

function uploadReq(): Request {
  const fields = new Map<string, unknown>([['file', fakeFile('photo.jpg')]])
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    formData: async () => ({ get: (k: string) => fields.get(k) ?? null }),
  } as unknown as Request
}

describe('POST /api/reviews/upload — rate limiting', () => {
  it('is rate-limited per tenant+ip and rejects (no storage write) once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(uploadReq())
    expect(res.status).toBe(429)
    expect(uploadCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('reviews_upload:tenant-1:203.0.113.9', 20, 10 * 60 * 1000)
  })

  it('allows the upload through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 19 })
    const res = await POST(uploadReq())
    expect(res.status).toBe(200)
    expect(uploadCalls).toHaveLength(1)
  })
})
