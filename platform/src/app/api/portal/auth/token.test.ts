import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { createToken, verifyPortalToken } from './token'

const SECRET = 'test-portal-secret'
// Set at module load too — `it.each` table arguments are evaluated eagerly,
// before any `beforeEach` runs, and one of them mints a token.
process.env.PORTAL_SECRET = SECRET

beforeEach(() => {
  process.env.PORTAL_SECRET = SECRET
})

describe('client portal token — round trip', () => {
  it('round-trips a valid token', () => {
    const token = createToken('client-1', 'tenant-1')
    expect(verifyPortalToken(token)).toEqual(expect.objectContaining({ id: 'client-1', tid: 'tenant-1' }))
  })
})

describe('client portal token — forgery and tampering rejected', () => {
  // BUG (fixed this pass, same class as team-portal/auth/token.ts): the
  // signature compare was a plain `sig !== expected` string comparison, not
  // timing-safe. Every sibling HMAC-token verifier in this codebase
  // (team-portal/auth/token, phone-fixup-token, referrer-portal-auth,
  // unsubscribe-token, webhook-verify, admin-auth) already uses
  // timingSafeEqual. These prove the fix rejects the same forgeries as
  // before — constant-time compare must not change accept/reject outcomes.
  it('rejects a tampered payload id (signature no longer matches)', () => {
    const token = createToken('victim-client', 'tenant-1')
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const tamperedB64 = Buffer.from(JSON.stringify({ ...payload, id: 'attacker-client' })).toString('base64')
    expect(verifyPortalToken(`${tamperedB64}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const payload = JSON.stringify({ id: 'client-1', tid: 'tenant-1', exp: Date.now() + 3600_000 })
    const wrongSig = createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    const forged = Buffer.from(payload).toString('base64') + '.' + wrongSig
    expect(verifyPortalToken(forged)).toBeNull()
  })

  it('rejects an expired token even with a valid signature', () => {
    const expiredPayload = JSON.stringify({ id: 'client-1', tid: 'tenant-1', exp: Date.now() - 1000 })
    const sig = createHmac('sha256', SECRET).update(expiredPayload).digest('hex')
    const expiredToken = Buffer.from(expiredPayload).toString('base64') + '.' + sig
    expect(verifyPortalToken(expiredToken)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['no separator', 'garbage'],
    ['non-hex signature', 'AQID.not-hex-at-all!!'],
    ['truncated signature', (() => {
      const token = createToken('client-1', 'tenant-1')
      const [payloadB64, sig] = token.split('.')
      return `${payloadB64}.${sig.slice(0, 10)}`
    })()],
  ])('rejects %s without throwing', (_label, input) => {
    expect(() => verifyPortalToken(input)).not.toThrow()
    expect(verifyPortalToken(input)).toBeNull()
  })
})

describe('client portal token — fails closed when PORTAL_SECRET is unconfigured', () => {
  beforeEach(() => {
    delete process.env.PORTAL_SECRET
  })

  it('createToken throws instead of minting with no secret', () => {
    expect(() => createToken('client-1', 'tenant-1')).toThrow(/PORTAL_SECRET/)
  })

  it('verifyPortalToken fails closed (does not throw) with no secret configured', () => {
    expect(() => verifyPortalToken('anything.anything')).not.toThrow()
    expect(verifyPortalToken('anything.anything')).toBeNull()
  })
})
