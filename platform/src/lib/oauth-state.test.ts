import { describe, it, expect, beforeAll, vi } from 'vitest'
import crypto from 'crypto'
import { signOAuthState, verifyOAuthState } from './oauth-state'

/**
 * Signed OAuth `state` for the Google Business connect flow. The callback stores
 * the returned Google tokens under the tenant named in `state`, so an unsigned
 * or forgeable state is a CSRF hole (CWE-352): an attacker could bind THEIR
 * Google account to a VICTIM tenant. The properties under test: only our own
 * secret can mint an accepted state, the tenant is bound in the signature, and
 * the state expires. Covers google/auth+callback, admin/google/auth+callback,
 * and social/connect/facebook+instagram, all of which share this mechanism.
 * These tests prove the negative cases matter: tampered, expired, and
 * cross-tenant states are all rejected, not just that round-tripping works.
 */

const SECRET = 'oauth-state-test-secret'

function mint(tenantId: string, exp: number): string {
  const payload = `${tenantId}.${exp}`
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

beforeAll(() => {
  process.env.ADMIN_TOKEN_SECRET = SECRET
})

describe('verifyOAuthState — happy path', () => {
  it('round-trips a freshly signed state back to its tenant id', () => {
    const state = signOAuthState('tenant-A')
    expect(verifyOAuthState(state)).toBe('tenant-A')
  })

  it('accepts a correctly signed, unexpired state', () => {
    expect(verifyOAuthState(mint('tenant-Z', Date.now() + 60000))).toBe('tenant-Z')
  })

  it('a state signed for one tenant never verifies as a different tenant', () => {
    const stateForB = signOAuthState('tenant-B')
    expect(verifyOAuthState(stateForB)).toBe('tenant-B')
    expect(verifyOAuthState(stateForB)).not.toBe('tenant-A')
  })
})

describe('verifyOAuthState — forgery rejected (CSRF defense)', () => {
  it('rejects a state signed with the wrong secret', () => {
    const payload = `victim-tenant.${Date.now() + 100000}`
    const badSig = crypto.createHmac('sha256', 'attacker-secret').update(payload).digest('hex')
    expect(verifyOAuthState(`${payload}.${badSig}`)).toBeNull()
  })

  it('rejects a state whose tenant id was swapped but signature kept', () => {
    const good = signOAuthState('tenant-A')
    const [, exp, sig] = good.split('.')
    // Attacker retargets the binding to a victim tenant, reusing A's signature.
    expect(verifyOAuthState(`victim-tenant.${exp}.${sig}`)).toBeNull()
  })

  it('rejects a flipped signature byte', () => {
    const good = signOAuthState('tenant-A')
    const flipped = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0')
    expect(verifyOAuthState(flipped)).toBeNull()
  })
})

describe('verifyOAuthState — expiry + malformed', () => {
  it('rejects an expired (but correctly signed) state', () => {
    expect(verifyOAuthState(mint('tenant-A', Date.now() - 1))).toBeNull()
  })

  it('rejects an expired state (TTL enforced, fake-timers)', () => {
    vi.useFakeTimers()
    try {
      const state = signOAuthState('tenant-A')
      vi.advanceTimersByTime(16 * 60 * 1000) // > 15 min TTL
      expect(verifyOAuthState(state)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a non-numeric expiry even if the signature matches', () => {
    expect(verifyOAuthState(mint('tenant-A', 'soon' as unknown as number))).toBeNull()
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['too few parts', 'tenant.123'],
    ['too many parts', 'a.b.c.d'],
  ])('rejects malformed state: %s', (_label, state) => {
    expect(verifyOAuthState(state as string | null | undefined)).toBeNull()
  })
})

describe('signOAuthState — fails closed', () => {
  it('throws at sign-time if ADMIN_TOKEN_SECRET is unset (never signs with an empty/undefined secret)', async () => {
    vi.resetModules()
    const prior = process.env.ADMIN_TOKEN_SECRET
    delete process.env.ADMIN_TOKEN_SECRET
    try {
      const { signOAuthState: sign } = await import('./oauth-state')
      expect(() => sign('tenant-A')).toThrow()
    } finally {
      process.env.ADMIN_TOKEN_SECRET = prior
      vi.resetModules()
    }
  })
})
