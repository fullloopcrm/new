/**
 * POST /api/uploads — team-portal auth recognition.
 *
 * The only real caller in the repo is the team-portal photo upload
 * (app/team/page.tsx's handlePhotoUpload), which authenticates with a PIN-
 * portal bearer token (Authorization: Bearer <token>, verified via
 * getPortalAuth()). This route previously only called getTenantForRequest()
 * — the Clerk/admin_token-cookie resolver — which a portal token never
 * satisfies, so every team-member photo upload 401'd unconditionally
 * (silently swallowed client-side by a bare `catch { }`). These tests prove
 * a portal-authenticated caller now succeeds, scoped to their own tenant,
 * while the admin/Clerk path used by any other future caller still works.
 *
 * formData() itself is stubbed (not built via a real multipart FormData
 * body) — jsdom's File/FormData/Request classes (vitest's `environment:
 * jsdom`) aren't brand-compatible with undici's multipart encoder used by
 * NextRequest.formData() at runtime, which is orthogonal to what this fix
 * changes (auth resolution, not multipart parsing).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const TENANT_ID = 'tenant-A'
const PORTAL_MEMBER_ID = 'team-member-1'

const { MockAuthError } = vi.hoisted(() => ({
  MockAuthError: class MockAuthError extends Error {
    status = 401
  },
}))

let tenantForRequestResult: { tenantId: string } | 'throw-auth-error'
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => {
    if (tenantForRequestResult === 'throw-auth-error') {
      throw new MockAuthError('Not authenticated')
    }
    return tenantForRequestResult
  },
  AuthError: MockAuthError,
}))

let portalAuthResult: { id: string; tid: string; role: string } | null
vi.mock('@/lib/team-portal-auth', () => ({
  getPortalAuth: () => portalAuthResult,
}))

let uploadedPath: string | null
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    storage: {
      from: () => ({
        upload: async (path: string) => {
          uploadedPath = path
          return { error: null }
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.example/${path}` } }),
      }),
    },
  },
}))

import { POST } from './route'

beforeEach(() => {
  tenantForRequestResult = 'throw-auth-error'
  portalAuthResult = null
  uploadedPath = null
})

const fakeFile = {
  size: 1,
  type: 'image/png',
  name: 'photo.png',
  arrayBuffer: async () => new ArrayBuffer(1),
}

function req(headers: Record<string, string> = {}) {
  return {
    headers: { get: (k: string) => headers[k] ?? headers[k.toLowerCase()] ?? null },
    formData: async () => ({
      get: (key: string) => (key === 'file' ? fakeFile : key === 'folder' ? 'avatars' : null),
    }),
  }
}

describe('POST /api/uploads — portal auth', () => {
  it('rejects with no portal token and no admin/Clerk session', async () => {
    const res = await POST(req() as never)
    expect(res.status).toBe(401)
    expect(uploadedPath).toBeNull()
  })

  it("accepts a portal bearer token and scopes the upload path to that member's tenant", async () => {
    portalAuthResult = { id: PORTAL_MEMBER_ID, tid: TENANT_ID, role: 'worker' }
    const res = await POST(req({ Authorization: 'Bearer portal-token' }) as never)
    expect(res.status).toBe(200)
    expect(uploadedPath).toMatch(new RegExp(`^${TENANT_ID}/avatars/`))
  })

  it('still accepts a real admin/Clerk dashboard session with no portal token', async () => {
    tenantForRequestResult = { tenantId: TENANT_ID }
    const res = await POST(req() as never)
    expect(res.status).toBe(200)
    expect(uploadedPath).toMatch(new RegExp(`^${TENANT_ID}/avatars/`))
  })
})
