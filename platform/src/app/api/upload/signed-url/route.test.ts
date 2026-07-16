import { describe, it, expect, vi } from 'vitest'

const createSignedUploadUrlMock = vi.fn(async (path: string) => ({
  data: { signedUrl: `https://storage.test/object/upload/sign/${path}?token=tok123`, token: 'tok123' },
  error: null,
}))
const getPublicUrlMock = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/uploads/${path}` } }))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-abc', name: 'Acme' })),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        createSignedUploadUrl: createSignedUploadUrlMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  },
}))

import { POST } from './route'

function jsonRequest(body: Record<string, unknown>) {
  return new Request('http://t/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/upload/signed-url', () => {
  it('returns a signed url + public url for a valid photo request', async () => {
    const res = await POST(jsonRequest({ type: 'photo', filename: 'me.jpg', contentType: 'image/jpeg' }) as never)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.signedUrl).toContain('tenant-abc/uploads/photos/')
    expect(json.publicUrl).toContain('tenant-abc/uploads/photos/')
    expect(json.token).toBe('tok123')
  })

  it('allows video under the media type', async () => {
    const res = await POST(jsonRequest({ type: 'media', filename: 'clip.mp4', contentType: 'video/mp4' }) as never)
    expect(res.status).toBe(200)
  })

  it('rejects video under the photo type', async () => {
    const res = await POST(jsonRequest({ type: 'photo', filename: 'clip.mp4', contentType: 'video/mp4' }) as never)
    expect(res.status).toBe(400)
  })

  it('rejects an unknown type', async () => {
    const res = await POST(jsonRequest({ type: 'nonsense', filename: 'x.jpg', contentType: 'image/jpeg' }) as never)
    expect(res.status).toBe(400)
  })
})
