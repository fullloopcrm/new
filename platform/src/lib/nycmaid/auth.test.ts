import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest'
import { createHmac } from 'crypto'

// auth.ts imports next/headers + supabase at module top for its async helpers.
// The functions under test here are pure (signing/verification), so neutralize
// those server-only imports to keep this a fast unit test.
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }))

import {
  createSessionCookie,
  verifySessionCookie,
  createClientSession,
  verifyClientSession,
  hashPassword,
} from './auth'

const SECRET = 'test-admin-password'
// Mirror the module's private signToken so we can forge/backdate cookies.
const sign = (payload: string) => createHmac('sha256', SECRET).update(payload).digest('hex')

beforeAll(() => {
  process.env.ADMIN_PASSWORD = SECRET
})

describe('session cookie — round trip', () => {
  it('round-trips a user session and returns the userId', () => {
    const userId = 'a1b2c3d4-0000-4000-8000-000000000001'
    const cookie = createSessionCookie(userId)
    expect(verifySessionCookie(cookie)).toEqual({ valid: true, userId })
  })

  it('round-trips a legacy (no-userId) session as valid with no userId', () => {
    const cookie = createSessionCookie()
    expect(verifySessionCookie(cookie)).toEqual({ valid: true })
  })
})

describe('session cookie — forgery is rejected', () => {
  it('rejects a tampered signature', () => {
    const cookie = createSessionCookie('user-1')
    const parts = cookie.split('.')
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('0') ? '11' : '00')
    expect(verifySessionCookie(parts.join('.'))).toEqual({ valid: false })
  })

  it('rejects impersonating another user by swapping the userId (signature no longer matches)', () => {
    const cookie = createSessionCookie('victim-user')
    const forged = cookie.replace('victim-user', 'attacker-user')
    expect(verifySessionCookie(forged)).toEqual({ valid: false })
  })

  it('rejects a cookie signed with a different secret', () => {
    const ts = Date.now().toString(36)
    const payload = `user-1.token123.${ts}`
    const wrongSig = createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    expect(verifySessionCookie(`${payload}.${wrongSig}`)).toEqual({ valid: false })
  })

  it('rejects a non-hex signature without throwing (constant-time compare must fail closed, not crash)', () => {
    const ts = Date.now().toString(36)
    const payload = `user-1.token123.${ts}`
    expect(() => verifySessionCookie(`${payload}.not-hex-at-all`)).not.toThrow()
    expect(verifySessionCookie(`${payload}.not-hex-at-all`)).toEqual({ valid: false })
  })

  it('rejects a truncated-but-valid-hex-prefix signature (differing length must fail closed before timingSafeEqual)', () => {
    const ts = Date.now().toString(36)
    const payload = `user-1.token123.${ts}`
    const shortSig = sign(payload).slice(0, 10)
    expect(verifySessionCookie(`${payload}.${shortSig}`)).toEqual({ valid: false })
  })
})

describe('session cookie — expiry', () => {
  it('rejects a session older than 24h even with a valid signature', () => {
    const oldTs = (Date.now() - 25 * 60 * 60 * 1000).toString(36)
    const payload = `user-1.token123.${oldTs}`
    expect(verifySessionCookie(`${payload}.${sign(payload)}`)).toEqual({ valid: false })
  })

  it('accepts a validly-signed session inside the 24h window', () => {
    const recentTs = (Date.now() - 60 * 1000).toString(36)
    const payload = `user-9.token123.${recentTs}`
    expect(verifySessionCookie(`${payload}.${sign(payload)}`)).toEqual({ valid: true, userId: 'user-9' })
  })
})

describe('session cookie — malformed input', () => {
  it.each([
    ['empty string', ''],
    ['single segment', 'garbage'],
    ['too many segments', 'a.b.c.d.e'],
    ['empty segments', '...'],
  ])('rejects %s', (_label, input) => {
    expect(verifySessionCookie(input)).toEqual({ valid: false })
  })
})

describe('client session', () => {
  it('round-trips a client id', () => {
    expect(verifyClientSession(createClientSession('client-42'))).toBe('client-42')
  })

  it('rejects a tampered client id', () => {
    const forged = createClientSession('client-42').replace('client-42', 'client-99')
    expect(verifyClientSession(forged)).toBeNull()
  })

  it('rejects a client session older than 30 days', () => {
    const oldTs = (Date.now() - 31 * 24 * 60 * 60 * 1000).toString()
    const payload = `client-42.${oldTs}`
    expect(verifyClientSession(`${payload}.${sign(payload)}`)).toBeNull()
  })

  it('rejects a malformed client session', () => {
    expect(verifyClientSession('a.b')).toBeNull()
  })
})

describe('password hashing', () => {
  it('is deterministic for the same input', () => {
    expect(hashPassword('hunter2')).toBe(hashPassword('hunter2'))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashPassword('hunter2')).not.toBe(hashPassword('hunter3'))
  })
})

describe('fail closed when ADMIN_PASSWORD is unset', () => {
  const ORIG = process.env.ADMIN_PASSWORD

  afterEach(() => {
    process.env.ADMIN_PASSWORD = ORIG
  })

  it('hashPassword() throws instead of hashing with a fallback key', () => {
    delete process.env.ADMIN_PASSWORD
    expect(() => hashPassword('hunter2')).toThrow()
  })

  it('createSessionCookie() throws instead of issuing a forgeable session', () => {
    delete process.env.ADMIN_PASSWORD
    expect(() => createSessionCookie('user-1')).toThrow()
  })

  it('createClientSession() throws instead of signing with an empty secret', () => {
    delete process.env.ADMIN_PASSWORD
    expect(() => createClientSession('client-1')).toThrow()
  })

  it('verifySessionCookie() rejects (fail-closed, no throw) a cookie that was validly signed while the secret WAS configured, once the secret is removed', () => {
    const cookie = createSessionCookie('user-1') // signed while ADMIN_PASSWORD=SECRET
    delete process.env.ADMIN_PASSWORD
    expect(verifySessionCookie(cookie)).toEqual({ valid: false })
  })

  it('verifySessionCookie() rejects a cookie forged with the well-known empty-key HMAC (what the old fallback allowed)', () => {
    delete process.env.ADMIN_PASSWORD
    const ts = Date.now().toString(36)
    const payload = `attacker-controlled-user.token123.${ts}`
    const emptyKeySig = createHmac('sha256', '').update(payload).digest('hex')
    expect(verifySessionCookie(`${payload}.${emptyKeySig}`)).toEqual({ valid: false })
  })

  it('verifyClientSession() rejects a client session forged with the well-known empty-key HMAC', () => {
    delete process.env.ADMIN_PASSWORD
    const ts = Date.now().toString()
    const payload = `victim-client-id.${ts}`
    const emptyKeySig = createHmac('sha256', '').update(payload).digest('hex')
    expect(verifyClientSession(`${payload}.${emptyKeySig}`)).toBeNull()
  })
})
