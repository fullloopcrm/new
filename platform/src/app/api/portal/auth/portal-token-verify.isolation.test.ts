import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import crypto from 'crypto'
import { createToken, verifyPortalToken } from './token'
import { createToken as createTeamToken } from '../../team-portal/auth/token'

/**
 * The client-portal bearer token carries `{ id, tid }` and is the sole proof of
 * which client (and which TENANT) a portal request acts as. Downstream portal
 * routes trust `verifyPortalToken(...).tid` to scope every query. So the token's
 * signature is a cross-tenant boundary: if `tid` could be swapped without
 * invalidating the token, client A could read/act inside tenant B.
 *
 * Existing tests (verify-bruteforce) cover the 6-digit code rate-limit — NOT the
 * HMAC token's cryptographic properties. This file covers those, all
 * mutation-proof (each forgery is contrasted with a correctly-signed control
 * that DOES verify, so a stubbed `verifyPortalToken` returning null could never
 * pass):
 *   - round-trip integrity
 *   - tenant-id (tid) tampering is rejected — the core isolation property
 *   - client-id tampering is rejected
 *   - a valid signature over an EXPIRED payload is still rejected
 *   - malformed input never throws (fails closed to null)
 *   - a token signed with a different secret is rejected
 *   - a team-portal token (different secret) does NOT verify as a portal token
 *   - with no PORTAL_SECRET configured, verify returns null (fails closed)
 */

const PORTAL_SECRET = 'portal-secret-under-test'
const TEAM_SECRET = 'team-secret-different'

const ORIG = {
  portal: process.env.PORTAL_SECRET,
  team: process.env.TEAM_PORTAL_SECRET,
}

function b64(s: string): string {
  return Buffer.from(s).toString('base64')
}

/** Mint a token with an arbitrary payload signed by the REAL portal secret. */
function signPayload(payload: object): string {
  const raw = JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', PORTAL_SECRET).update(raw).digest('hex')
  return b64(raw) + '.' + sig
}

beforeEach(() => {
  process.env.PORTAL_SECRET = PORTAL_SECRET
  process.env.TEAM_PORTAL_SECRET = TEAM_SECRET
})

afterAll(() => {
  if (ORIG.portal === undefined) delete process.env.PORTAL_SECRET
  else process.env.PORTAL_SECRET = ORIG.portal
  if (ORIG.team === undefined) delete process.env.TEAM_PORTAL_SECRET
  else process.env.TEAM_PORTAL_SECRET = ORIG.team
})

describe('verifyPortalToken — cross-tenant isolation', () => {
  it('round-trips a token it minted (control: verify is not always-null)', () => {
    const out = verifyPortalToken(createToken('client-A', 'tenant-A'))
    expect(out).toEqual({ id: 'client-A', tid: 'tenant-A', exp: expect.any(Number) })
  })

  it('rejects a token whose tid was swapped to another tenant (no re-sign)', () => {
    const tok = createToken('client-A', 'tenant-A')
    const [payloadB64, sig] = tok.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    payload.tid = 'tenant-VICTIM'
    const forged = b64(JSON.stringify(payload)) + '.' + sig
    expect(verifyPortalToken(forged)).toBeNull()
  })

  it('rejects a token whose client id was tampered', () => {
    const tok = createToken('client-A', 'tenant-A')
    const [payloadB64, sig] = tok.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    payload.id = 'client-ELEVATED'
    const forged = b64(JSON.stringify(payload)) + '.' + sig
    expect(verifyPortalToken(forged)).toBeNull()
  })

  it('rejects a validly-signed but EXPIRED token', () => {
    const expired = signPayload({ id: 'client-A', tid: 'tenant-A', exp: Date.now() - 1000 })
    expect(verifyPortalToken(expired)).toBeNull()
  })

  it('accepts a validly-signed unexpired token (expiry control)', () => {
    const fresh = signPayload({ id: 'client-A', tid: 'tenant-A', exp: Date.now() + 60_000 })
    expect(verifyPortalToken(fresh)).toMatchObject({ id: 'client-A', tid: 'tenant-A' })
  })

  it.each([
    ['empty string', ''],
    ['no separator', 'garbage'],
    ['bad base64 payload', '!!!.deadbeef'],
    ['missing signature', b64(JSON.stringify({ id: 'a', tid: 'b', exp: Date.now() + 1000 }))],
  ])('fails closed (null, no throw) on malformed input: %s', (_label, tok) => {
    expect(verifyPortalToken(tok)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const raw = JSON.stringify({ id: 'client-A', tid: 'tenant-A', exp: Date.now() + 60_000 })
    const foreignSig = crypto.createHmac('sha256', 'some-other-secret').update(raw).digest('hex')
    expect(verifyPortalToken(b64(raw) + '.' + foreignSig)).toBeNull()
  })

  it('does NOT accept a team-portal token as a portal token (cross-portal confusion)', () => {
    // Identical token FORMAT, different secret. A leaked team token must not
    // grant client-portal access, and vice-versa.
    const teamTok = createTeamToken('member-A', 'tenant-A')
    expect(verifyPortalToken(teamTok)).toBeNull()
  })

  it('returns null when PORTAL_SECRET is unconfigured (getSecret throws → caught → deny)', () => {
    const tok = createToken('client-A', 'tenant-A')
    delete process.env.PORTAL_SECRET
    expect(verifyPortalToken(tok)).toBeNull()
  })
})
