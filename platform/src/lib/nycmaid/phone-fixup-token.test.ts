import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import { createPhoneFixupToken, verifyPhoneFixupToken } from './phone-fixup-token'

const SECRET = 'test-admin-password'
const HOUR_MS = 60 * 60 * 1000

beforeEach(() => {
  process.env.ADMIN_PASSWORD = SECRET
})

describe('phone-fixup token — round trip', () => {
  it('round-trips a valid token', () => {
    const token = createPhoneFixupToken('member-1', Date.now() + HOUR_MS)
    expect(verifyPhoneFixupToken(token)).toEqual({ valid: true, teamMemberId: 'member-1' })
  })
})

describe('phone-fixup token — forgery and tampering rejected', () => {
  it('rejects a tampered team_member_id (signature no longer matches)', () => {
    const token = createPhoneFixupToken('victim-member', Date.now() + HOUR_MS)
    const forged = token.replace('victim-member', 'attacker-member')
    expect(verifyPhoneFixupToken(forged)).toEqual({ valid: false, reason: 'bad_signature' })
  })

  it('rejects a token signed with a different secret', () => {
    const expiry = Date.now() + HOUR_MS
    const payload = `member-1.${expiry}`
    const wrongSig = createHmac('sha256', 'not-the-secret').update(payload).digest('hex')
    expect(verifyPhoneFixupToken(`${payload}.${wrongSig}`)).toEqual({ valid: false, reason: 'bad_signature' })
  })

  it('rejects an expired token even with a valid signature', () => {
    const token = createPhoneFixupToken('member-1', Date.now() - 1000)
    expect(verifyPhoneFixupToken(token)).toEqual({ valid: false, reason: 'expired' })
  })

  it.each([
    ['empty string', ''],
    ['single segment', 'garbage'],
    ['too many segments', 'a.b.c.d'],
  ])('rejects %s as malformed', (_label, input) => {
    expect(verifyPhoneFixupToken(input).valid).toBe(false)
  })
})

describe('phone-fixup token — fails closed when ADMIN_PASSWORD is unconfigured', () => {
  // The pre-fix code signed/verified with `process.env.ADMIN_PASSWORD || ''`
  // in two separate files (cron/phone-fixup mint side, team-portal/update-phone
  // verify side). An unset ADMIN_PASSWORD meant both ends silently agreed on an
  // empty-string key — anyone who knew (or guessed, since it's this repo's own
  // pattern) a team_member_id could forge a token and rewrite that cleaner's
  // phone number with zero authentication. These prove the unconfigured case
  // is now a hard deny, not a silent, forgeable default.
  beforeEach(() => {
    delete process.env.ADMIN_PASSWORD
  })

  afterEach(() => {
    process.env.ADMIN_PASSWORD = SECRET
  })

  it('createPhoneFixupToken throws instead of minting with an empty secret', () => {
    expect(() => createPhoneFixupToken('member-1', Date.now() + HOUR_MS)).toThrow(/ADMIN_PASSWORD/)
  })

  it('verifyPhoneFixupToken fails closed (does not throw) on a token forged with the empty-secret default', () => {
    const expiry = Date.now() + HOUR_MS
    const payload = `attacker-member.${expiry}`
    const forgedSig = createHmac('sha256', '').update(payload).digest('hex')
    expect(() => verifyPhoneFixupToken(`${payload}.${forgedSig}`)).not.toThrow()
    expect(verifyPhoneFixupToken(`${payload}.${forgedSig}`)).toEqual({ valid: false, reason: 'not_configured' })
  })

  it('a token validly minted while configured is rejected once ADMIN_PASSWORD disappears', () => {
    process.env.ADMIN_PASSWORD = SECRET
    const token = createPhoneFixupToken('member-1', Date.now() + HOUR_MS)
    delete process.env.ADMIN_PASSWORD
    expect(verifyPhoneFixupToken(token)).toEqual({ valid: false, reason: 'not_configured' })
  })
})
