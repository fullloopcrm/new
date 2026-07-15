import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/public-upload is fully unauthenticated (tenant resolved from the
 * signed x-tenant-id header on the tenant's public marketing host, no login).
 * It had no rate limit at all, so an anonymous caller could loop it to write
 * unlimited 25MB objects into the shared `uploads` bucket, burning storage
 * cost/quota against any tenant. Fixed with a per-IP rate limit (rateLimitDb)
 * ahead of the storage write.
 */

let uploadCalls = 0
let rlCallsForBucket: Record<string, number> = {}

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: 'tenant-victim' }),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, max: number) => {
    rlCallsForBucket[bucketKey] = (rlCallsForBucket[bucketKey] || 0) + 1
    const count = rlCallsForBucket[bucketKey]
    return { allowed: count <= max, remaining: Math.max(0, max - count) }
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: async () => {
          uploadCalls++
          return { error: null }
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example.com/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

// Real multipart Request/File parsing doesn't survive jsdom's test
// environment (undici's brand check rejects jsdom's File), so the route is
// exercised with a request-like object exposing only what it actually reads:
// headers.get() and an async formData() returning a fake File.
function req(ip: string) {
  const file = {
    type: 'image/jpeg',
    size: 10,
    name: 'photo.jpg',
    arrayBuffer: async () => new ArrayBuffer(10),
  }
  return {
    headers: { get: (h: string) => (h === 'x-forwarded-for' ? ip : null) },
    formData: async () => ({ get: (k: string) => (k === 'file' ? file : null) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

beforeEach(() => {
  uploadCalls = 0
  rlCallsForBucket = {}
})

describe('POST /api/public-upload — anonymous storage-abuse rate limit', () => {
  it('caps uploads per IP even when the caller loops the request unbounded', async () => {
    let rejected = 0
    for (let i = 0; i < 30; i++) {
      const res = await POST(req('198.51.100.9'))
      if (res.status === 429) rejected++
    }
    expect(uploadCalls).toBeLessThanOrEqual(20)
    expect(rejected).toBeGreaterThan(0)
  })

  it('does not throttle a different IP sharing no bucket with the attacker', async () => {
    for (let i = 0; i < 25; i++) {
      await POST(req('198.51.100.9'))
    }
    const res = await POST(req('203.0.113.5'))
    expect(res.status).toBe(200)
  })
})
