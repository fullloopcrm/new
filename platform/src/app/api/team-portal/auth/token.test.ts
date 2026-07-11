import { describe, it, expect, beforeAll } from 'vitest'
import { createToken, verifyToken } from './token'

/**
 * Field-staff (team) portal token verify. Same hardening as the client portal:
 * length-guarded crypto.timingSafeEqual instead of `sig !== expected`. Pins the
 * valid round-trip and rejection of forged/malformed tokens without throwing.
 */

const SECRET = 'team-portal-test-secret'

beforeAll(() => {
  process.env.TEAM_PORTAL_SECRET = SECRET
})

describe('verifyToken (team portal)', () => {
  it('accepts a token it minted and returns the role', () => {
    const token = createToken('member-1', 'tenant-A', 25, 'lead')
    expect(verifyToken(token)).toMatchObject({ id: 'member-1', tid: 'tenant-A', role: 'lead' })
  })

  it('defaults a role-less (legacy) token to least-privilege worker', () => {
    const token = createToken('member-1', 'tenant-A')
    expect(verifyToken(token)?.role).toBe('worker')
  })

  it('rejects a tampered signature', () => {
    const token = createToken('member-1', 'tenant-A')
    const [payload, sig] = token.split('.')
    const flipped = sig.slice(0, -1) + (sig.endsWith('0') ? '1' : '0')
    expect(verifyToken(`${payload}.${flipped}`)).toBeNull()
  })

  it('rejects a wrong-length signature without throwing (length guard before timingSafeEqual)', () => {
    const token = createToken('member-1', 'tenant-A')
    const [payload] = token.split('.')
    expect(verifyToken(`${payload}.abc`)).toBeNull()
  })

  it('rejects a token with no signature segment', () => {
    const token = createToken('member-1', 'tenant-A')
    const [payload] = token.split('.')
    expect(verifyToken(payload)).toBeNull()
  })

  it('rejects garbage input', () => {
    expect(verifyToken('')).toBeNull()
    expect(verifyToken('....')).toBeNull()
  })
})
