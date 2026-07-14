/**
 * Storage-key injection fix — public-upload, uploads, booking-notes/upload,
 * team-applications/upload all built the object storage key by concatenating
 * the file's client-supplied `name` (extension) and/or a client-supplied
 * `folder` field directly into the path string with no character allowlist,
 * unlike every sibling upload route in the repo (apply/signed-url,
 * lead-media/signed-url, finance/upload, team-portal/video-upload,
 * management-applications/upload, cleaners/upload, admin/notes/upload — all
 * of which strip to [a-z0-9] or check against a safe-extension allowlist).
 * A filename like "a.png/../x" or a folder like "../other" landed raw in the
 * Supabase Storage key, letting an uploader inject extra path segments (and
 * literal ".." components) into the object key instead of a clean extension.
 * Fixed by applying the same [^a-z0-9]-strip / [^a-zA-Z0-9_-]-strip pattern
 * already used everywhere else in the repo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn().mockResolvedValue({ id: 'tenant-1', slug: 'test-tenant' }),
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn().mockResolvedValue({ allowed: true, remaining: 59 }),
}))

const uploadedPaths: string[] = []

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: vi.fn().mockImplementation((path: string) => {
          uploadedPaths.push(path)
          return Promise.resolve({ error: null })
        }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${path}` } }),
      }),
    },
  },
}))

// A minimal fake NextRequest — avoids the real Web FormData/File/Request
// classes, whose jsdom-vs-runtime realm mismatch throws a webidl assertion
// error in this project's vitest environment.
function fakeRequest(fields: Record<string, unknown>) {
  return {
    headers: { get: () => null },
    formData: async () => ({
      get: (key: string) => fields[key] ?? null,
    }),
  } as unknown as Parameters<typeof import('./route').POST>[0]
}

function fakeFile(name: string, type = 'image/jpeg', size = 100) {
  return {
    name,
    type,
    size,
    arrayBuffer: async () => new ArrayBuffer(size),
  }
}

beforeEach(() => {
  uploadedPaths.length = 0
})

describe('public-upload — storage key sanitization', () => {
  it('strips path-traversal characters out of a malicious filename extension', async () => {
    const { POST } = await import('./route')
    const req = fakeRequest({ file: fakeFile('a.jpg/../../../evil'), folder: 'lead-media' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(uploadedPaths).toHaveLength(1)
    // The uploaded key must be exactly tenantId/folder/filename — no extra
    // segments or ".." smuggled in via the extension.
    const parts = uploadedPaths[0].split('/')
    expect(parts).toHaveLength(3)
    expect(parts[2]).toMatch(/^\d+-[a-z0-9]+\.[a-z0-9]{1,8}$/)
  })

  it('strips path-traversal characters out of a malicious folder field', async () => {
    const { POST } = await import('./route')
    const req = fakeRequest({ file: fakeFile('photo.jpg'), folder: '../../other-tenant/secrets' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const parts = uploadedPaths[0].split('/')
    expect(parts).toHaveLength(3)
    expect(parts[1]).not.toContain('..')
    expect(parts[1]).not.toContain('/')
  })
})
