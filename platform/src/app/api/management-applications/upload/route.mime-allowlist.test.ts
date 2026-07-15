// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * WITNESS — missing MIME allow-list on public management-applications upload.
 *
 * POST /api/management-applications/upload (public, unauthenticated — tenant
 * resolved from the host header) accepted ANY Content-Type and stored it in
 * the public 'uploads' bucket, unlike its own signed-url sibling
 * (management-applications/signed-url, which already gates by ALLOWED_TYPES)
 * and every other upload route in the app. An anonymous caller could upload
 * arbitrary content (e.g. text/html, image/svg+xml) and get back a working
 * public URL on the trusted storage domain — stored-XSS/phishing vector.
 * Ports the same ALLOWED_MIMES map (photo/video/resume) from the signed-url
 * route into this direct-upload route.
 */

const uploadMock = vi.hoisted(() => vi.fn(async () => ({ error: null })))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: uploadMock,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.example.com/${path}` } }),
      }),
    },
  },
}))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tenant-1' })),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 5 })) }))

import { POST } from './route'

function postUpload(type: string, fileType: string, filename = 'file.bin') {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([1, 2, 3])], filename, { type: fileType }))
  form.set('type', type)

  return POST(
    new Request('http://acme-a.example.com/api/management-applications/upload', {
      method: 'POST',
      body: form,
    }) as unknown as import('next/server').NextRequest,
  )
}

beforeEach(() => {
  uploadMock.mockClear()
})

describe('POST /api/management-applications/upload — MIME allow-list', () => {
  it('rejects an HTML upload disguised as a photo (stored-XSS vector)', async () => {
    const res = await postUpload('photo', 'text/html', 'evil.html')
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('rejects an SVG upload for a resume (stored-XSS vector)', async () => {
    const res = await postUpload('resume', 'image/svg+xml', 'evil.svg')
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown/missing type field entirely', async () => {
    const res = await postUpload('', 'image/jpeg')
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('accepts a legitimate photo upload', async () => {
    const res = await postUpload('photo', 'image/jpeg', 'photo.jpg')
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })

  it('accepts a legitimate resume PDF upload', async () => {
    const res = await postUpload('resume', 'application/pdf', 'resume.pdf')
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })
})
