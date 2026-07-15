import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { createToken, verifyToken } from './token'

const SECRET = 'test-team-portal-secret'
// Set at module load too — `it.each` table arguments are evaluated eagerly,
// before any `beforeEach` runs, and one of them mints a token.
process.env.TEAM_PORTAL_SECRET = SECRET

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = SECRET
})

describe('team-portal token — round trip', () => {
  it('round-trips a valid token', () => {
    const token = createToken('member-1', 'tenant-1', 12, 'lead')
    expect(verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'lead' })
  })

  it('defaults role to worker when omitted (legacy tokens)', () => {
    const token = createToken('member-1', 'tenant-1')
    expect(verifyToken(token)).toEqual({ id: 'member-1', tid: 'tenant-1', role: 'worker' })
  })
})

describe('team-portal token — forgery and tampering rejected', () => {
  // BUG (fixed this pass): verifyToken compared the signature with a plain
  // `sig !== expected` string compare instead of a constant-time compare —
  // the only HMAC-token verifier in this codebase still doing that (every
  // sibling: portal/auth/token, phone-fixup-token, referrer-portal-auth,
  // unsubscribe-token, webhook-verify, admin-auth all use timingSafeEqual).
  // These prove the fix rejects the same forgeries the old code rejected —
  // constant-time compare must not change the accept/reject outcome, only
  // remove the timing side-channel.
  it('rejects a tampered payload id (signature no longer matches)', () => {
    const token = createToken('victim-member', 'tenant-1')
    const [payloadB64, sig] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const tamperedB64 = Buffer.from(JSON.stringify({ ...payload, id: 'attacker-member' })).toString('base64')
    expect(verifyToken(`${tamperedB64}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const payload = JSON.stringify({ id: 'member-1', tid: 'tenant-1', pr: 0, r: 'worker', exp: Date.now() + 3600_000 })
    const wrongSig = createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    const forged = Buffer.from(payload).toString('base64') + '.' + wrongSig
    expect(verifyToken(forged)).toBeNull()
  })

  it('rejects an expired token even with a valid signature', () => {
    const token = createToken('member-1', 'tenant-1')
    const [payloadB64] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    const expiredPayload = JSON.stringify({ ...payload, exp: Date.now() - 1000 })
    const sig = createHmac('sha256', SECRET).update(expiredPayload).digest('hex')
    const expiredToken = Buffer.from(expiredPayload).toString('base64') + '.' + sig
    expect(verifyToken(expiredToken)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['no separator', 'garbage'],
    ['non-hex signature', 'AQID.not-hex-at-all!!'],
    ['truncated signature', (() => {
      const token = createToken('member-1', 'tenant-1')
      const [payloadB64, sig] = token.split('.')
      return `${payloadB64}.${sig.slice(0, 10)}`
    })()],
  ])('rejects %s without throwing', (_label, input) => {
    expect(() => verifyToken(input)).not.toThrow()
    expect(verifyToken(input)).toBeNull()
  })
})

describe('team-portal token — fails closed when TEAM_PORTAL_SECRET is unconfigured', () => {
  beforeEach(() => {
    delete process.env.TEAM_PORTAL_SECRET
  })

  it('createToken throws instead of minting with no secret', () => {
    expect(() => createToken('member-1', 'tenant-1')).toThrow(/TEAM_PORTAL_SECRET/)
  })

  it('verifyToken fails closed (does not throw) with no secret configured', () => {
    expect(() => verifyToken('anything.anything')).not.toThrow()
    expect(verifyToken('anything.anything')).toBeNull()
  })
})
