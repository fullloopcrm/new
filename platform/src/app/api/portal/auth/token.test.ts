import { describe, it, expect, beforeAll } from 'vitest'
import { createToken, verifyPortalToken } from './token'

/**
 * Client-portal token verify. The signature check was switched from a plain
 * `sig !== expected` string compare to a length-guarded crypto.timingSafeEqual
 * to kill the timing side-channel. These tests pin the behavior that matters:
 * valid tokens round-trip, and every malformed/forged shape is rejected as
 * null WITHOUT throwing (a wrong-length sig would make timingSafeEqual throw if
 * the length guard were ever removed).
 */

const SECRET = 'portal-test-secret'

beforeAll(() => {
  process.env.PORTAL_SECRET = SECRET
})

describe('verifyPortalToken', () => {
  it('accepts a token it minted (round-trip)', () => {
    const token = createToken('client-1', 'tenant-A')
    expect(verifyPortalToken(token)).toMatchObject({ id: 'client-1', tid: 'tenant-A' })
  })

  it('rejects a tampered signature', () => {
    const token = createToken('client-1', 'tenant-A')
    const [payload, sig] = token.split('.')
    const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    expect(verifyPortalToken(`${payload}.${flipped}`)).toBeNull()
  })

  it('rejects a wrong-length signature without throwing (length guard before timingSafeEqual)', () => {
    const token = createToken('client-1', 'tenant-A')
    const [payload] = token.split('.')
    expect(verifyPortalToken(`${payload}.abc`)).toBeNull()
  })

  it('rejects a token with no signature segment', () => {
    const token = createToken('client-1', 'tenant-A')
    const [payload] = token.split('.')
    expect(verifyPortalToken(payload)).toBeNull()
  })

  it('rejects an expired token', () => {
    const payload = JSON.stringify({ id: 'c', tid: 't', exp: Date.now() - 1000 })
    // Re-sign an already-expired payload with the same secret so only exp fails.
    const crypto = require('crypto')
    const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    const token = Buffer.from(payload).toString('base64') + '.' + hmac
    expect(verifyPortalToken(token)).toBeNull()
  })

  it('rejects garbage input', () => {
    expect(verifyPortalToken('')).toBeNull()
    expect(verifyPortalToken('....')).toBeNull()
  })
})
