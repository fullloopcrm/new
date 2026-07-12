import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { createHmac } from 'crypto'
import { signTenantHeader, verifyTenantHeaderSig } from './tenant-header-sig'

/**
 * Supplements tenant-header-sig.test.ts, which already proves the core HMAC
 * correctness and cross-tenant/tamper rejection. The UNCOVERED surface is
 * `getSecret()`'s fallback chain:
 *
 *     TENANT_HEADER_SIG_SECRET || ADMIN_TOKEN_SECRET || PORTAL_SECRET
 *
 * The signing secret is the entire trust anchor for x-tenant-id. Two things must
 * hold and were untested:
 *   1. precedence is deterministic — the primary var wins when present, so
 *      middleware and route handlers that both see it resolve the SAME key
 *   2. with NONE of the three configured, verification never silently returns
 *      true (it fails closed by throwing, not by trusting an unsigned id)
 *
 * signTenantHeader has already been shown byte-equal to Node's HMAC-SHA256 in
 * the sibling test, so comparing against `createHmac` here is a valid oracle.
 */

const PRIMARY = 'tenant-sig-primary'
const ADMIN = 'admin-token-secret-fallback'
const PORTAL = 'portal-secret-fallback'

const ORIG = {
  primary: process.env.TENANT_HEADER_SIG_SECRET,
  admin: process.env.ADMIN_TOKEN_SECRET,
  portal: process.env.PORTAL_SECRET,
}

const ref = (msg: string, key: string) => createHmac('sha256', key).update(msg).digest('hex')

function clearAll(): void {
  delete process.env.TENANT_HEADER_SIG_SECRET
  delete process.env.ADMIN_TOKEN_SECRET
  delete process.env.PORTAL_SECRET
}

beforeEach(clearAll)

afterAll(() => {
  for (const [k, v] of [
    ['TENANT_HEADER_SIG_SECRET', ORIG.primary],
    ['ADMIN_TOKEN_SECRET', ORIG.admin],
    ['PORTAL_SECRET', ORIG.portal],
  ] as const) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('tenant-header-sig — secret fallback chain', () => {
  it('signs with ADMIN_TOKEN_SECRET when the primary is unset', () => {
    process.env.ADMIN_TOKEN_SECRET = ADMIN
    expect(signTenantHeader('tenant-A')).toBe(ref('tenant-A', ADMIN))
    expect(verifyTenantHeaderSig('tenant-A', signTenantHeader('tenant-A'))).toBe(true)
  })

  it('signs with PORTAL_SECRET when primary and admin are both unset', () => {
    process.env.PORTAL_SECRET = PORTAL
    expect(signTenantHeader('tenant-A')).toBe(ref('tenant-A', PORTAL))
  })

  it('prefers the primary over the admin fallback (deterministic precedence)', () => {
    process.env.TENANT_HEADER_SIG_SECRET = PRIMARY
    process.env.ADMIN_TOKEN_SECRET = ADMIN
    const sig = signTenantHeader('tenant-A')
    expect(sig).toBe(ref('tenant-A', PRIMARY))
    expect(sig).not.toBe(ref('tenant-A', ADMIN))
  })

  it('a sig minted under the admin fallback does NOT verify once the primary is set (keys are not interchangeable)', () => {
    process.env.ADMIN_TOKEN_SECRET = ADMIN
    const sigUnderAdmin = signTenantHeader('tenant-A')
    process.env.TENANT_HEADER_SIG_SECRET = PRIMARY // primary now shadows admin
    expect(verifyTenantHeaderSig('tenant-A', sigUnderAdmin)).toBe(false)
  })

  it('fails closed when NO secret is configured — verify never returns true', () => {
    // getSecret throws; verifyTenantHeaderSig surfaces it rather than trusting an
    // unsigned id. A throw = request denied downstream, never accepted.
    expect(() => verifyTenantHeaderSig('tenant-A', ref('tenant-A', PRIMARY))).toThrow()
  })

  it('still short-circuits to false for a falsy sig even with no secret (no throw path)', () => {
    // The `!sig` guard runs before getSecret, so an absent sig is a clean reject.
    expect(verifyTenantHeaderSig('tenant-A', null)).toBe(false)
    expect(verifyTenantHeaderSig('tenant-A', '')).toBe(false)
  })
})
