import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * requireAdmin() (src/lib/require-admin.ts) gates every platform-admin route
 * (80 call sites) behind the super-admin PIN token. It had zero direct test
 * coverage before this file. verifyAdminToken's own HMAC/timing-safe-compare
 * logic lives in app/api/admin-auth/route.ts and is exercised indirectly via
 * other route tests; here it's mocked to isolate requireAdmin's own control
 * flow: missing cookie, invalid token, valid token.
 */

const mockCookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined),
  }),
}))

const verifyAdminToken = vi.fn<(token: string) => boolean>()
vi.mock('@/app/api/admin-auth/route', () => ({
  verifyAdminToken: (t: string) => verifyAdminToken(t),
}))

import { requireAdmin } from './require-admin'

beforeEach(() => {
  mockCookieStore.clear()
  verifyAdminToken.mockReset().mockReturnValue(false)
})

describe('requireAdmin', () => {
  it('returns 401 Unauthorized when no admin_token cookie is present', async () => {
    const result = await requireAdmin()
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    expect(verifyAdminToken).not.toHaveBeenCalled()
  })

  it('returns 401 Unauthorized when the admin_token cookie fails verification (forged/expired token)', async () => {
    mockCookieStore.set('admin_token', 'forged-token')
    verifyAdminToken.mockReturnValue(false)

    const result = await requireAdmin()
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    expect(verifyAdminToken).toHaveBeenCalledWith('forged-token')
  })

  it('returns null (authorized) when the admin_token cookie verifies', async () => {
    mockCookieStore.set('admin_token', 'valid-token')
    verifyAdminToken.mockReturnValue(true)

    const result = await requireAdmin()
    expect(result).toBeNull()
  })

  it('does not treat an empty-string cookie value as a valid token', async () => {
    mockCookieStore.set('admin_token', '')
    verifyAdminToken.mockReturnValue(true) // even if verify would say yes, empty token must short-circuit

    const result = await requireAdmin()
    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
  })
})
