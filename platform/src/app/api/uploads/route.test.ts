// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/uploads — authenticated (any valid tenant session), tenant
 * resolved via getTenantForRequest(). Previously accepted a caller-supplied
 * `folder` form field AND the raw file-extension (from the attacker-
 * controlled multipart filename) spliced directly into the storage key
 * (`${tenant.id}/${folder}/....${ext}`) with zero sanitization — unlike
 * every sibling upload route in the repo, which either hardcodes the folder
 * or sanitizes it. A caller (any authenticated tenant, not just the one
 * known frontend caller which always sends folder:'avatars') could hit the
 * route directly with folder:'../other-tenant-id' or a crafted filename to
 * write into another tenant's prefix in the shared `uploads` bucket (same
 * class as public-upload's 7c17cb47 fix). Fixed by stripping folder to a
 * safe charset and sanitizing the extension the same way as finance/upload
 * and management-applications/upload.
 */

const TENANT_A = 'tid-a'

const uploadMock = vi.hoisted(() =>
  vi.fn(async (_path: string, ..._rest: unknown[]) => ({ error: null as null }))
)

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

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: TENANT_A, tenant: { id: TENANT_A }, role: 'owner' })),
  }
})

import { POST } from './route'

function makeRequest(fields: Record<string, string | File>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return new Request('https://tenant.example.com/api/uploads', {
    method: 'POST',
    body: fd,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  uploadMock.mockResolvedValue({ error: null })
})

describe('POST /api/uploads', () => {
  it('neutralizes a caller-supplied folder traversal instead of escaping the tenant prefix', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const req = makeRequest({ file, folder: '../../other-tenant-id' })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    // Dots/slashes are stripped so the path can never leave `${tenant}/`; the
    // remaining alnum/dash text becomes an inert flat folder name nested
    // safely under the caller's own tenant prefix, not a traversal.
    expect(calledPath.startsWith(`${TENANT_A}/`)).toBe(true)
    expect(calledPath).not.toContain('..')
    expect(calledPath.split('/')[0]).toBe(TENANT_A)
    expect(calledPath.split('/').length).toBe(3)
  })

  it('sanitizes a malicious extension instead of embedding it raw in the key', async () => {
    const file = new File(['x'], 'evil.png/../../escape', { type: 'image/png' })
    const req = makeRequest({ file })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath).not.toContain('..')
    expect(calledPath.split('/').length).toBe(3) // tenantId/folder/filename, no extra segments smuggled in via the extension
  })

  it('positive control: legitimate folder + extension pass through unchanged', async () => {
    const file = new File(['x'], 'avatar.png', { type: 'image/png' })
    const req = makeRequest({ file, folder: 'avatars' })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
    const [[calledPath]] = uploadMock.mock.calls
    expect(calledPath.startsWith(`${TENANT_A}/avatars/`)).toBe(true)
    expect(calledPath.endsWith('.png')).toBe(true)
  })
})
