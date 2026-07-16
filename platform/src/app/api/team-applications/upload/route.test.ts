// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/team-applications/upload — fully public (unauthenticated, no
 * tenant context at all), used by the public /apply/[slug] page's photo
 * upload step. Previously spliced `file.name`'s raw extension straight into
 * the storage key with no sanitization — the same dot-segment-escape class
 * already fixed in public-upload, management-applications/upload,
 * booking-notes/upload, and cleaners/upload, just missed here.
 */

const uploadMock = vi.hoisted(() =>
  vi.fn(async (_path: string, ..._rest: unknown[]) => ({ error: null as null }))
)

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/team-photos/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

function makeRequest(fields: Record<string, string | File>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return new Request('https://tenant.example.com/api/team-applications/upload', {
    method: 'POST',
    body: fd,
    headers: { 'x-forwarded-for': '1.2.3.4' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  uploadMock.mockResolvedValue({ error: null })
})

describe('POST /api/team-applications/upload', () => {
  it('sanitizes a malicious extension instead of embedding it raw in the key', async () => {
    const file = new File(['x'], 'evil.png/../../escape', { type: 'image/png' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath).not.toContain('..')
    expect(calledPath.split('/').length).toBe(2) // applications/filename, no extra segments smuggled in via the extension
  })

  it('strips a dotless traversal filename down to a safe fallback extension', async () => {
    const file = new File(['x'], '../../../other-tenant-id/team-photos/hero', { type: 'image/png' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath).not.toContain('..')
    expect(calledPath.startsWith('applications/')).toBe(true)
  })

  it('positive control: legitimate upload still succeeds with its extension preserved', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.url).toContain('applications/')
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath.endsWith('.jpg')).toBe(true)
  })
})
