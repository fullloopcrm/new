/**
 * verifyPortalToken previously compared the HMAC signature with plain `!==`,
 * unlike every sibling token/cookie verifier in this codebase (team-portal
 * auth token, referrer-portal auth, client-auth session cookie — the last of
 * which shares this same PORTAL_SECRET), which all use crypto.timingSafeEqual.
 * This suite proves the constant-time fix didn't change any accept/reject
 * outcome, and locks in the new length-mismatch/malformed-token guards.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { createHmac } from 'crypto'
import { createToken, verifyPortalToken } from './token'

const SECRET = 'portal-token-test-secret'

function signPayload(payload: Record<string, unknown>, secret = SECRET): string {
  const json = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret).update(json).digest('hex')
  return Buffer.from(json).toString('base64') + '.' + hmac
}

beforeEach(() => {
  process.env.PORTAL_SECRET = SECRET
})

describe('verifyPortalToken', () => {
  it('accepts a token minted by createToken', () => {
    const token = createToken('client-1', 'tenant-1')
    expect(verifyPortalToken(token)).toEqual({ id: 'client-1', tid: 'tenant-1', exp: expect.any(Number) })
  })

  it('rejects an expired token', () => {
    const token = signPayload({ id: 'client-1', tid: 'tenant-1', exp: Date.now() - 1000 })
    expect(verifyPortalToken(token)).toBeNull()
  })

  it('rejects a tampered payload (tid swapped after signing, sig unchanged)', () => {
    const token = createToken('client-1', 'tenant-1')
    const sig = token.split('.')[1]
    const forgedPayload = Buffer.from(JSON.stringify({ id: 'client-1', tid: 'tenant-2', exp: Date.now() + 60_000 })).toString('base64')
    expect(verifyPortalToken(`${forgedPayload}.${sig}`)).toBeNull()
  })

  it('rejects a tampered signature', () => {
    const token = createToken('client-1', 'tenant-1')
    const tampered = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0')
    expect(verifyPortalToken(tampered)).toBeNull()
  })

  it('rejects a signature of the wrong length instead of throwing', () => {
    const token = createToken('client-1', 'tenant-1')
    const [payloadB64] = token.split('.')
    expect(verifyPortalToken(`${payloadB64}.abc`)).toBeNull()
  })

  it('rejects a token signed with the wrong secret', () => {
    const token = signPayload({ id: 'client-1', tid: 'tenant-1', exp: Date.now() + 60_000 }, 'a-different-secret')
    expect(verifyPortalToken(token)).toBeNull()
  })

  it('rejects garbage tokens (no dot separator, missing parts)', () => {
    expect(verifyPortalToken('not-a-real-token')).toBeNull()
    expect(verifyPortalToken('')).toBeNull()
    expect(verifyPortalToken('.')).toBeNull()
  })
})
