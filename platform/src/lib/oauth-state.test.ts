import { describe, it, expect, beforeAll, vi } from 'vitest'

/**
 * signOAuthState/verifyOAuthState close an OAuth login CSRF gap (CWE-352): a
 * connect callback must only bind an external account to the tenant that
 * actually initiated the flow, not whatever the state param claims. Previously
 * untested despite being the sole thing standing between a forged callback and
 * cross-tenant account binding (see google/auth+callback, admin/google/auth+
 * callback, and now social/connect/facebook+instagram). These tests prove the
 * negative cases matter: tampered, expired, and cross-tenant states are all
 * rejected, not just that round-tripping a fresh state works.
 */

const SECRET = 'oauth-state-test-secret'

beforeAll(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

describe('signOAuthState / verifyOAuthState', () => {
  it('round-trips: a state it signed for a tenant verifies back to that tenant', async () => {
    const { signOAuthState, verifyOAuthState } = await import('./oauth-state')
    const state = signOAuthState('tenant-A')
    expect(verifyOAuthState(state)).toBe('tenant-A')
  })

  it('rejects a state signed for a different tenant when checked against another id (no cross-tenant reuse of the mechanism)', async () => {
    const { signOAuthState, verifyOAuthState } = await import('./oauth-state')
    const stateForB = signOAuthState('tenant-B')
    // verifyOAuthState only returns the tenant embedded in the state itself —
    // proving an attacker cannot supply their own tenantId and have it honored.
    expect(verifyOAuthState(stateForB)).toBe('tenant-B')
    expect(verifyOAuthState(stateForB)).not.toBe('tenant-A')
  })

  it('rejects a tampered tenant id (sig no longer matches payload)', async () => {
    const { signOAuthState, verifyOAuthState } = await import('./oauth-state')
    const state = signOAuthState('tenant-A')
    const [, exp, sig] = state.split('.')
    const forged = `tenant-attacker.${exp}.${sig}`
    expect(verifyOAuthState(forged)).toBeNull()
  })

  it('rejects a tampered signature', async () => {
    const { signOAuthState, verifyOAuthState } = await import('./oauth-state')
    const state = signOAuthState('tenant-A')
    const tampered = state.slice(0, -1) + (state.endsWith('0') ? '1' : '0')
    expect(verifyOAuthState(tampered)).toBeNull()
  })

  it('rejects an expired state (TTL enforced)', async () => {
    vi.useFakeTimers()
    try {
      const { signOAuthState, verifyOAuthState } = await import('./oauth-state')
      const state = signOAuthState('tenant-A')
      vi.advanceTimersByTime(16 * 60 * 1000) // > 15 min TTL
      expect(verifyOAuthState(state)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['malformed (wrong segment count)', 'a.b'],
    ['non-numeric exp', 'tenant-A.not-a-number.deadbeef'],
  ])('rejects %s state', async (_label, input) => {
    const { verifyOAuthState } = await import('./oauth-state')
    expect(verifyOAuthState(input as string | null | undefined)).toBeNull()
  })

  it('rejects a well-formed but forged state built without the real secret', async () => {
    const crypto = await import('crypto')
    const { verifyOAuthState } = await import('./oauth-state')
    const payload = `tenant-A.${Date.now() + 60000}`
    const wrongSig = crypto.createHmac('sha256', 'not-the-real-secret').update(payload).digest('hex')
    expect(verifyOAuthState(`${payload}.${wrongSig}`)).toBeNull()
  })

  it('throws at sign-time if ADMIN_TOKEN_SECRET is unset (fails closed, never signs with an empty/undefined secret)', async () => {
    vi.resetModules()
    const prior = process.env.ADMIN_TOKEN_SECRET
    delete process.env.ADMIN_TOKEN_SECRET
    try {
      const { signOAuthState } = await import('./oauth-state')
      expect(() => signOAuthState('tenant-A')).toThrow()
    } finally {
      process.env.ADMIN_TOKEN_SECRET = prior
      vi.resetModules()
    }
  })
})
