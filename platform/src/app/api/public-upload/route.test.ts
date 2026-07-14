// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/public-upload — fully public (unauthenticated, no ownership
 * check by design), tenant resolved from host header. Previously accepted a
 * caller-supplied `folder` form field spliced directly into the storage key
 * (`${tenant.id}/${folder}/...`). Since HTTP clients normalize dot-segments
 * before a request is sent, a folder value like `../other-tenant-id` could
 * write into another tenant's prefix in the shared `uploads` bucket — no
 * legitimate caller ever sends this field (confirmed: the only caller,
 * BookingForm.tsx, never appends it). Fixed by hardcoding the folder and
 * sanitizing the extension. Also had zero rate limiting on an anonymous,
 * 25MB-per-file endpoint (video allowed) — added, matching the sibling
 * lead-media/signed-url route's convention.
 */

const TENANT_A = 'tid-a'

const uploadMock = vi.hoisted(() =>
  vi.fn(async (_path: string, ..._rest: unknown[]) => ({ error: null as null }))
)
const rateLimitMock = vi.hoisted(() => vi.fn(async () => ({ allowed: true, remaining: 59 })))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/uploads/${path}` } }),
      }),
    },
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_A }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: rateLimitMock }))

import { POST } from './route'

function makeRequest(fields: Record<string, string | File>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return new Request('https://tenant.example.com/api/public-upload', {
    method: 'POST',
    body: fd,
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  uploadMock.mockResolvedValue({ error: null })
  rateLimitMock.mockResolvedValue({ allowed: true, remaining: 59 })
})

describe('POST /api/public-upload', () => {
  it('writes under the resolved tenant prefix and ignores an attacker-supplied folder traversal', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const req = makeRequest({ file, folder: '../../other-tenant-id' })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath.startsWith(`${TENANT_A}/lead-media/`)).toBe(true)
    expect(calledPath).not.toContain('..')
    expect(calledPath).not.toContain('other-tenant-id')
  })

  it('sanitizes a malicious extension instead of embedding it raw in the key', async () => {
    const file = new File(['x'], 'evil.png/../../escape', { type: 'image/png' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath).not.toContain('..')
    expect(calledPath.split('/').length).toBe(3) // tenantId/lead-media/filename, no extra segments smuggled in via the extension
  })

  it('rejects uploads once the per-IP rate limit is exceeded', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, remaining: 0 })
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(429)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('positive control: legitimate upload with no folder field still succeeds', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.path.startsWith(`${TENANT_A}/lead-media/`)).toBe(true)
  })
})
