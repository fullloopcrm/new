import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import crypto from 'crypto'
import { createToken, verifyToken } from './token'
import { createToken as createPortalToken } from '../../portal/auth/token'

/**
 * The field-staff (team) portal token carries `{ id, tid, r }` — member id,
 * tenant id, and role tier (worker | lead | manager). `verifyToken` is trusted
 * to scope every team-portal query by `tid` AND to gate privileged actions by
 * `role`. Two boundaries ride on the signature:
 *   1. cross-tenant — `tid` cannot be swapped to another tenant
 *   2. privilege    — `r` cannot be escalated worker → manager
 *
 * Existing tests (pin-enumeration) cover login PIN throttling, NOT the token's
 * crypto. This file covers the isolation + privilege properties, each
 * mutation-proof against a correctly-signed control:
 *   - round-trip integrity (id, tid, role)
 *   - tid tampering rejected
 *   - role tampering (privilege escalation) rejected
 *   - a legacy token with no `r` defaults to least-privilege 'worker'
 *   - validly-signed-but-expired rejected
 *   - malformed input fails closed to null
 *   - foreign-secret token rejected
 *   - a client-portal token (different secret) does NOT verify as a team token
 *   - no TEAM_PORTAL_SECRET configured => null (fails closed)
 */

const TEAM_SECRET = 'team-secret-under-test'
const PORTAL_SECRET = 'portal-secret-different'

const ORIG = {
  team: process.env.TEAM_PORTAL_SECRET,
  portal: process.env.PORTAL_SECRET,
}

function b64(s: string): string {
  return Buffer.from(s).toString('base64')
}

/** Mint a team token with an arbitrary payload signed by the REAL team secret. */
function signPayload(payload: object): string {
  const raw = JSON.stringify(payload)
  const sig = crypto.createHmac('sha256', TEAM_SECRET).update(raw).digest('hex')
  return b64(raw) + '.' + sig
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = TEAM_SECRET
  process.env.PORTAL_SECRET = PORTAL_SECRET
})

afterAll(() => {
  if (ORIG.team === undefined) delete process.env.TEAM_PORTAL_SECRET
  else process.env.TEAM_PORTAL_SECRET = ORIG.team
  if (ORIG.portal === undefined) delete process.env.PORTAL_SECRET
  else process.env.PORTAL_SECRET = ORIG.portal
})

describe('verifyToken (team portal) — cross-tenant + privilege isolation', () => {
  it('round-trips id/tid/role for a manager token (control: not always-null)', () => {
    const out = verifyToken(createToken('member-A', 'tenant-A', 2500, 'manager'))
    expect(out).toEqual({ id: 'member-A', tid: 'tenant-A', role: 'manager' })
  })

  it('rejects a token whose tid was swapped to another tenant', () => {
    const tok = createToken('member-A', 'tenant-A', 0, 'worker')
    const [payloadB64, sig] = tok.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    payload.tid = 'tenant-VICTIM'
    const forged = b64(JSON.stringify(payload)) + '.' + sig
    expect(verifyToken(forged)).toBeNull()
  })

  it('rejects role escalation: worker token tampered to manager (no re-sign)', () => {
    const tok = createToken('member-A', 'tenant-A', 0, 'worker')
    const [payloadB64, sig] = tok.split('.')
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    expect(payload.r).toBe('worker')
    payload.r = 'manager'
    const forged = b64(JSON.stringify(payload)) + '.' + sig
    expect(verifyToken(forged)).toBeNull()
  })

  it('defaults a legacy token with no role field to least-privilege worker', () => {
    // Pre-tier tokens carry no `r`; they must NOT be treated as elevated.
    const legacy = signPayload({ id: 'member-A', tid: 'tenant-A', exp: Date.now() + 60_000 })
    expect(verifyToken(legacy)).toEqual({ id: 'member-A', tid: 'tenant-A', role: 'worker' })
  })

  it('rejects a validly-signed but EXPIRED token', () => {
    const expired = signPayload({ id: 'member-A', tid: 'tenant-A', r: 'manager', exp: Date.now() - 1000 })
    expect(verifyToken(expired)).toBeNull()
  })

  it.each([
    ['empty string', ''],
    ['no separator', 'garbage'],
    ['bad base64 payload', '!!!.deadbeef'],
  ])('fails closed (null, no throw) on malformed input: %s', (_label, tok) => {
    expect(verifyToken(tok)).toBeNull()
  })

  it('rejects a token signed with a different secret', () => {
    const raw = JSON.stringify({ id: 'member-A', tid: 'tenant-A', r: 'manager', exp: Date.now() + 60_000 })
    const foreignSig = crypto.createHmac('sha256', 'some-other-secret').update(raw).digest('hex')
    expect(verifyToken(b64(raw) + '.' + foreignSig)).toBeNull()
  })

  it('does NOT accept a client-portal token as a team token (cross-portal confusion)', () => {
    const portalTok = createPortalToken('client-A', 'tenant-A')
    expect(verifyToken(portalTok)).toBeNull()
  })

  it('returns null when TEAM_PORTAL_SECRET is unconfigured (fails closed)', () => {
    const tok = createToken('member-A', 'tenant-A', 0, 'worker')
    delete process.env.TEAM_PORTAL_SECRET
    expect(verifyToken(tok)).toBeNull()
  })

  it('rejects a referrer-portal token (scope:"ref") replayed at the team verifier', () => {
    // TEAM_PORTAL_SECRET is shared with referrer-portal-auth.ts, so a
    // referrer token is HMAC-valid here — the scope field is the only thing
    // that can stop cross-portal replay.
    const referrerToken = signPayload({ rid: 'referrer-A', tid: 'tenant-A', scope: 'ref', exp: Date.now() + 60_000 })
    expect(verifyToken(referrerToken)).toBeNull()
  })

  it('accepts a correctly-scoped team token (control for the scope gate)', () => {
    const out = verifyToken(createToken('member-A', 'tenant-A', 0, 'worker'))
    expect(out).toEqual({ id: 'member-A', tid: 'tenant-A', role: 'worker' })
  })

  it('still accepts a legacy scope-less team token (grandfather clause)', () => {
    const legacy = signPayload({ id: 'member-A', tid: 'tenant-A', r: 'lead', exp: Date.now() + 60_000 })
    expect(verifyToken(legacy)).toEqual({ id: 'member-A', tid: 'tenant-A', role: 'lead' })
  })
})
