import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'
import {
  createReferrerToken,
  verifyReferrerToken,
  getReferrerAuth,
  hashOtp,
} from './referrer-portal-auth'
import { createToken as createTeamToken } from '@/app/api/team-portal/auth/token'

/**
 * Referrer portal session tokens. These bind a referrer to ONE tenant and one
 * scope ('ref'). The isolation properties under test: (1) a token is unforgeable
 * without TEAM_PORTAL_SECRET, (2) it carries its tenant in the signed payload so
 * it can't be retargeted, (3) the scope gate stops a TEAM-portal token from being
 * replayed on referrer routes (the two share the secret), and (4) expired tokens
 * are rejected. OTP hashing must be deterministic per code and secret.
 */

const SECRET = 'referrer-portal-test-secret'

// Mint a token the same way createReferrerToken does, but with caller-chosen
// scope/exp so we can exercise the scope + expiry gates directly.
function mint(payloadObj: Record<string, unknown>): string {
  const payload = JSON.stringify(payloadObj)
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return Buffer.from(payload).toString('base64') + '.' + hmac
}

beforeAll(() => {
  process.env.TEAM_PORTAL_SECRET = SECRET
})

describe('verifyReferrerToken — happy path + binding', () => {
  it('round-trips a freshly minted token and returns its referrer + tenant', () => {
    const token = createReferrerToken('ref-1', 'tenant-A')
    expect(verifyReferrerToken(token)).toEqual({ rid: 'ref-1', tid: 'tenant-A' })
  })

  it('carries the tenant in the signed payload — the tid cannot be swapped without breaking the sig', () => {
    const token = createReferrerToken('ref-1', 'tenant-A')
    const [payloadB64] = token.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    // Attacker rewrites the tenant, keeps the original signature.
    const forged = Buffer.from(JSON.stringify({ ...payload, tid: 'tenant-B' })).toString('base64') + '.' + token.split('.')[1]
    expect(verifyReferrerToken(forged)).toBeNull()
  })
})

describe('verifyReferrerToken — forgery / tampering rejected', () => {
  it('rejects a token signed with the wrong secret', () => {
    const payload = JSON.stringify({ rid: 'r', tid: 't', scope: 'ref', exp: Date.now() + 100000 })
    const badSig = crypto.createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    const token = Buffer.from(payload).toString('base64') + '.' + badSig
    expect(verifyReferrerToken(token)).toBeNull()
  })

  it('rejects a token whose signature byte was flipped', () => {
    const token = createReferrerToken('ref-1', 'tenant-A')
    const flipped = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')
    expect(verifyReferrerToken(flipped)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['no dot separator', 'abcdef'],
    ['dot but empty sig', 'abc.'],
    ['non-base64 garbage', '!!!.###'],
  ])('rejects malformed token: %s', (_label, token) => {
    expect(verifyReferrerToken(token)).toBeNull()
  })
})

describe('verifyReferrerToken — scope + expiry gates', () => {
  it("rejects a token missing scope:'ref' (blocks cross-portal replay of a team token)", () => {
    // A real team-portal token shares the secret but has no scope field.
    const teamToken = createTeamToken('member-1', 'tenant-A', 0, 'worker')
    expect(verifyReferrerToken(teamToken)).toBeNull()
  })

  it('rejects a token carrying a different scope', () => {
    const token = mint({ rid: 'r', tid: 't', scope: 'team', exp: Date.now() + 100000 })
    expect(verifyReferrerToken(token)).toBeNull()
  })

  it('rejects an expired referrer token', () => {
    const token = mint({ rid: 'r', tid: 't', scope: 'ref', exp: Date.now() - 1 })
    expect(verifyReferrerToken(token)).toBeNull()
  })

  it('accepts a correctly-scoped, unexpired, correctly-signed token', () => {
    const token = mint({ rid: 'r9', tid: 't9', scope: 'ref', exp: Date.now() + 100000 })
    expect(verifyReferrerToken(token)).toEqual({ rid: 'r9', tid: 't9' })
  })
})

describe('getReferrerAuth — bearer extraction', () => {
  const req = (auth?: string) =>
    new Request('https://x.test', auth ? { headers: { authorization: auth } } : undefined)

  it('extracts and verifies a Bearer token', () => {
    const token = createReferrerToken('ref-1', 'tenant-A')
    expect(getReferrerAuth(req(`Bearer ${token}`))).toEqual({ rid: 'ref-1', tid: 'tenant-A' })
  })

  it('returns null with no Authorization header', () => {
    expect(getReferrerAuth(req())).toBeNull()
  })

  it('returns null for a valid-looking but unsigned token', () => {
    const token = Buffer.from(JSON.stringify({ rid: 'r', tid: 't', scope: 'ref', exp: Date.now() + 1000 })).toString('base64') + '.deadbeef'
    expect(getReferrerAuth(req(`Bearer ${token}`))).toBeNull()
  })
})

describe('hashOtp', () => {
  it('is deterministic for the same code + secret', () => {
    expect(hashOtp('123456')).toBe(hashOtp('123456'))
  })

  it('differs for different codes', () => {
    expect(hashOtp('123456')).not.toBe(hashOtp('123457'))
  })

  it('is not the raw code (it is hashed)', () => {
    const h = hashOtp('123456')
    expect(h).not.toContain('123456')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})
