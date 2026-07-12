import { describe, it, expect, beforeAll } from 'vitest'
import crypto from 'crypto'
import {
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
  type UnsubscribePayload,
} from './unsubscribe-token'

/**
 * Signed unsubscribe tokens gate /api/unsubscribe so an attacker can't opt out
 * an arbitrary client by guessing UUIDs. The security property: the (clientId,
 * tenantId, channel) triple is bound by an HMAC, so changing any field without
 * re-signing (which requires the secret) is rejected. Verification is
 * constant-time and tolerant of malformed input.
 */

const SECRET = 'unsub-test-secret'
const P: UnsubscribePayload = { clientId: 'client-1', tenantId: 'tenant-A', channel: 'email' }

beforeAll(() => {
  process.env.PORTAL_SECRET = SECRET
  delete process.env.ADMIN_TOKEN_SECRET // ensure PORTAL_SECRET is the one in use
})

describe('signUnsubscribeToken / verifyUnsubscribeToken — round trip', () => {
  it('verifies a token it signed and returns the exact payload', () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken(P))).toEqual(P)
  })

  it('round-trips the sms channel too', () => {
    const p: UnsubscribePayload = { ...P, channel: 'sms' }
    expect(verifyUnsubscribeToken(signUnsubscribeToken(p))).toEqual(p)
  })
})

describe('verifyUnsubscribeToken — tamper rejection (cannot opt out an arbitrary client)', () => {
  it('rejects a token whose clientId was swapped to a victim, keeping the original sig', () => {
    const token = signUnsubscribeToken(P)
    const [, sig] = [token.slice(0, token.lastIndexOf('.')), token.slice(token.lastIndexOf('.') + 1)]
    const forgedBody = Buffer.from(`victim-client.tenant-A.email`).toString('base64url')
    expect(verifyUnsubscribeToken(`${forgedBody}.${sig}`)).toBeNull()
  })

  it('rejects a token signed with the wrong secret (forged signature)', () => {
    const body = `${P.clientId}.${P.tenantId}.${P.channel}`
    const badSig = crypto.createHmac('sha256', 'wrong-secret').update(body).digest('hex')
    const token = Buffer.from(body).toString('base64url') + '.' + badSig
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('rejects a flipped signature byte', () => {
    const token = signUnsubscribeToken(P)
    const flipped = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a')
    expect(verifyUnsubscribeToken(flipped)).toBeNull()
  })

  it('rejects an unknown channel even if the body is otherwise well-formed and re-signed', () => {
    const body = `client-1.tenant-A.push`
    const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
    const token = Buffer.from(body).toString('base64url') + '.' + sig
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('rejects a body missing fields even when correctly signed', () => {
    const body = `client-1.tenant-A` // no channel
    const sig = crypto.createHmac('sha256', SECRET).update(body).digest('hex')
    const token = Buffer.from(body).toString('base64url') + '.' + sig
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })
})

describe('verifyUnsubscribeToken — malformed / empty input', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['no dot', 'abcdef'],
  ])('returns null for %s', (_label, token) => {
    expect(verifyUnsubscribeToken(token as string | null | undefined)).toBeNull()
  })

  it('returns null on a wrong-length signature without throwing (constant-time guard)', () => {
    const body = `${P.clientId}.${P.tenantId}.${P.channel}`
    const token = Buffer.from(body).toString('base64url') + '.short'
    expect(verifyUnsubscribeToken(token)).toBeNull()
  })
})

describe('unsubscribeUrl', () => {
  it('builds a URL with the signed token, verifiable back to the payload', () => {
    const url = unsubscribeUrl('https://app.test/', P)
    expect(url.startsWith('https://app.test/unsubscribe?t=')).toBe(true)
    const t = decodeURIComponent(url.split('t=')[1])
    expect(verifyUnsubscribeToken(t)).toEqual(P)
  })

  it('does not double the slash when origin has a trailing slash', () => {
    expect(unsubscribeUrl('https://app.test/', P)).not.toContain('test//unsubscribe')
  })
})
