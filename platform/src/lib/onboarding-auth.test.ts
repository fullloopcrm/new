import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * This is the actual security guarantee behind "Regenerate link" on
 * admin/tenants/[id]: a token minted before a version bump must stop
 * working, without needing a token blocklist. If this test regresses, link
 * revocation silently stops working (a leaked link stays valid forever).
 */

const { AuthError } = vi.hoisted(() => ({
  AuthError: class AuthError extends Error { status = 401 },
}))
const getTenantForRequestMock = vi.fn()
vi.mock('./tenant-query', () => ({
  getTenantForRequest: (...args: unknown[]) => getTenantForRequestMock(...args),
  AuthError,
}))

const h = vi.hoisted(() => ({ tenant: null as Record<string, unknown> | null }))
vi.mock('./supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: h.tenant, error: null }),
        }),
      }),
    }),
  },
}))

import { resolveOnboardingTenantId } from './onboarding-auth'
import { signOnboardingToken } from './onboarding-token'

describe('resolveOnboardingTenantId', () => {
  beforeEach(() => {
    process.env.ONBOARDING_TOKEN_SECRET = 'test-secret'
    getTenantForRequestMock.mockReset()
  })

  it('session wins when present, even if a token is also passed', async () => {
    getTenantForRequestMock.mockResolvedValue({ tenantId: 'session-tenant' })
    const token = signOnboardingToken('token-tenant', 1)
    expect(await resolveOnboardingTenantId(token)).toBe('session-tenant')
  })

  it('falls back to a valid token when there is no session', async () => {
    getTenantForRequestMock.mockRejectedValue(new AuthError('no session'))
    h.tenant = { onboarding_link_version: 1 }
    const token = signOnboardingToken('tenant-A', 1)
    expect(await resolveOnboardingTenantId(token)).toBe('tenant-A')
  })

  it('rejects a token minted at an OLD link version after the tenant regenerated (version bumped)', async () => {
    getTenantForRequestMock.mockRejectedValue(new AuthError('no session'))
    const oldToken = signOnboardingToken('tenant-A', 1)
    h.tenant = { onboarding_link_version: 2 } // regenerated since the token was minted
    expect(await resolveOnboardingTenantId(oldToken)).toBeNull()
  })

  it('a token minted at the CURRENT version still works', async () => {
    getTenantForRequestMock.mockRejectedValue(new AuthError('no session'))
    h.tenant = { onboarding_link_version: 2 }
    const currentToken = signOnboardingToken('tenant-A', 2)
    expect(await resolveOnboardingTenantId(currentToken)).toBe('tenant-A')
  })

  it('returns null for a missing/malformed token with no session', async () => {
    getTenantForRequestMock.mockRejectedValue(new AuthError('no session'))
    expect(await resolveOnboardingTenantId(null)).toBeNull()
    expect(await resolveOnboardingTenantId('garbage')).toBeNull()
  })

  it('re-throws a non-AuthError from the session check instead of masking it as anonymous', async () => {
    getTenantForRequestMock.mockRejectedValue(new Error('DB connection lost'))
    await expect(resolveOnboardingTenantId(null)).rejects.toThrow('DB connection lost')
  })
})
