// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * WITNESS — missing MIME allow-list on /api/finance/upload.
 *
 * POST /api/finance/upload (requires finance.expenses) accepted ANY
 * Content-Type and stored it in the public 'uploads' bucket, unlike the
 * general-purpose sibling /api/uploads (ALLOWED_TYPES: jpeg/png/webp/pdf) and
 * every other upload route in the app. Any tenant member with finance.expenses
 * could upload arbitrary content (e.g. text/html, image/svg+xml) as a
 * "receipt" and get back a working public URL on the trusted storage domain —
 * stored-XSS/phishing vector, same class already fixed on
 * management-applications/upload. Fixed by mirroring /api/uploads' allow-list.
 */

const uploadMock = vi.hoisted(() => vi.fn(async () => ({ data: { path: 'x' }, error: null })))
const requirePermissionMock = vi.hoisted(() => vi.fn())

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
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { POST } from './route'

beforeEach(() => {
  uploadMock.mockClear()
  requirePermissionMock.mockReset()
  requirePermissionMock.mockResolvedValue({ tenant: { tenantId: 'tenant-1' }, error: null })
})

function postUpload(fileType: string, filename = 'file.bin', type = 'receipt') {
  const form = new FormData()
  form.set('file', new File([new Uint8Array([1, 2, 3])], filename, { type: fileType }))
  form.set('type', type)

  return POST(
    new Request('http://acme-a.example.com/api/finance/upload', {
      method: 'POST',
      body: form,
    }) as unknown as import('next/server').NextRequest,
  )
}

describe('POST /api/finance/upload — MIME allow-list', () => {
  it('rejects an HTML upload disguised as a receipt (stored-XSS vector)', async () => {
    const res = await postUpload('text/html', 'evil.html')
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('rejects an SVG upload (stored-XSS vector)', async () => {
    const res = await postUpload('image/svg+xml', 'evil.svg')
    expect(res.status).toBe(400)
    expect(uploadMock).not.toHaveBeenCalled()
  })

  it('accepts a legitimate receipt photo upload', async () => {
    const res = await postUpload('image/jpeg', 'receipt.jpg')
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })

  it('accepts a legitimate PDF statement upload', async () => {
    const res = await postUpload('application/pdf', 'statement.pdf', 'statement')
    expect(res.status).toBe(200)
    expect(uploadMock).toHaveBeenCalledTimes(1)
  })
})
