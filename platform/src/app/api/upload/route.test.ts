// @vitest-environment node
//
// This route's multipart parsing needs the platform's native File/FormData
// (what Vercel's Node.js runtime actually uses) rather than the project's
// default jsdom environment, which has its own incompatible File/Blob
// implementation and mangles multipart bodies built with real File objects.
import { describe, it, expect, vi } from 'vitest'

const uploadMock = vi.fn(async (_path: string, _body: Buffer, _opts: Record<string, unknown>) => ({ error: null }))
const getPublicUrlMock = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.test/uploads/${path}` } }))

vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-abc', name: 'Acme' })),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      }),
    },
  },
}))

import { POST } from './route'

function multipartRequest(file: File | null) {
  const fd = new FormData()
  if (file) fd.append('file', file)
  return new Request('http://t/api/upload', { method: 'POST', body: fd })
}

describe('POST /api/upload', () => {
  it('uploads a valid image and returns a public url', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'photo.png', { type: 'image/png' })
    const res = await POST(multipartRequest(file) as never)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.url).toContain('tenant-abc/uploads/')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const [path] = uploadMock.mock.calls[0]
    expect(path).toMatch(/^tenant-abc\/uploads\/\d+-[a-f0-9]{8}\.png$/)
  })

  it('rejects when no file is provided', async () => {
    const res = await POST(multipartRequest(null) as never)
    expect(res.status).toBe(400)
  })

  it('rejects unsupported mime types', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'evil.exe', { type: 'application/x-msdownload' })
    const res = await POST(multipartRequest(file) as never)
    expect(res.status).toBe(400)
  })

  it('rejects files over the 100MB limit', async () => {
    const big = new Uint8Array(101 * 1024 * 1024)
    const file = new File([big], 'huge.mp4', { type: 'video/mp4' })
    const res = await POST(multipartRequest(file) as never)
    expect(res.status).toBe(400)
  })
})
