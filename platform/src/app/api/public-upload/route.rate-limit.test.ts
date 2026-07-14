/**
 * public-upload/route.ts — missing rate limiting.
 *
 * This is a fully anonymous, unauthenticated endpoint (tenant resolved from a
 * signed host header, not a session) accepting up to 25MB files, including
 * video, with zero throttling — unlike the sibling lead-media/signed-url
 * route which already rate-limits at 60 requests / 10 min per tenant+ip.
 */
import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

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

function uploadReq(): NextRequest {
  const fields = new Map<string, unknown>([['file', fakeFile('photo.jpg')]])
  return {
    headers: new Headers({ 'x-forwarded-for': '203.0.113.9' }),
    formData: async () => ({ get: (k: string) => fields.get(k) ?? null }),
  } as unknown as NextRequest
}

describe('POST /api/public-upload — rate limiting', () => {
  it('is rate-limited per tenant+ip and rejects once the bucket is exhausted', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: false, remaining: 0 })
    const res = await POST(uploadReq())
    expect(res.status).toBe(429)
    expect(uploadCalls).toHaveLength(0)
    expect(rateLimitDb).toHaveBeenCalledWith('public_upload:tenant-1:203.0.113.9', 60, 10 * 60 * 1000)
  })

  it('allows the upload through when under the limit', async () => {
    rateLimitDb.mockResolvedValueOnce({ allowed: true, remaining: 59 })
    const res = await POST(uploadReq())
    expect(res.status).toBe(200)
    expect(uploadCalls).toHaveLength(1)
  })
})
