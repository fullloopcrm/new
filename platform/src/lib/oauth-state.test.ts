import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'
import { signOAuthState, verifyOAuthState } from './oauth-state'

/**
 * Signed OAuth `state` for the Google Business connect flow. The callback stores
 * the returned Google tokens under the tenant named in `state`, so an unsigned
 * or forgeable state is a CSRF hole (CWE-352): an attacker could bind THEIR
 * Google account to a VICTIM tenant. The properties under test: only our own
 * secret can mint an accepted state, the tenant is bound in the signature, and
 * the state expires.
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

  it('accepts a correctly signed, unexpired state', () => {
    expect(verifyOAuthState(mint('tenant-Z', Date.now() + 60000))).toBe('tenant-Z')
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
