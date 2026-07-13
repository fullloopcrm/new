import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Shared signer/verifier for the cleaner phone-fixup self-service link
 * (mint side: api/cron/phone-fixup, verify side: api/team-portal/update-phone).
 * Both previously reimplemented `createHmac('sha256', process.env.ADMIN_PASSWORD
 * || '').update(...)` locally — an unset ADMIN_PASSWORD signed/verified with a
 * known empty-string key, so anyone who guessed a team_member_id could forge a
 * token and rewrite that cleaner's phone number with no auth at all. Same root
 * cause as the ADMIN_PASSWORD fail-open fixed in lib/nycmaid/auth.ts; extracted
 * here so both ends of the token contract can't drift out of sync again.
 */

function getSecret(): string {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) {
    throw new Error('ADMIN_PASSWORD env var is required to sign/verify phone-fixup tokens. Refusing to use an empty fallback secret.')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createPhoneFixupToken(teamMemberId: string, expiryMs: number): string {
  const payload = `${teamMemberId}.${expiryMs}`
  return `${payload}.${sign(payload)}`
}

export interface ParsedPhoneFixupToken {
  valid: boolean
  teamMemberId?: string
  reason?: 'malformed' | 'bad_signature' | 'expired' | 'not_configured'
}

export function verifyPhoneFixupToken(token: string): ParsedPhoneFixupToken {
  if (!token) return { valid: false, reason: 'malformed' }
  const parts = token.split('.')
  if (parts.length !== 3) return { valid: false, reason: 'malformed' }
  const [teamMemberId, expiry, sig] = parts
  if (!teamMemberId || !expiry || !sig) return { valid: false, reason: 'malformed' }

  let expected: string
  try {
    expected = sign(`${teamMemberId}.${expiry}`)
  } catch {
    // ADMIN_PASSWORD unconfigured — fail closed, never treat as a valid token.
    return { valid: false, reason: 'not_configured' }
  }

  const expectedBuf = Buffer.from(expected, 'hex')
  const sigBuf = Buffer.from(sig, 'hex')
  if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) {
    return { valid: false, reason: 'bad_signature' }
  }

  const expiryMs = Number(expiry)
  if (!Number.isFinite(expiryMs) || Date.now() > expiryMs) return { valid: false, reason: 'expired' }
  return { valid: true, teamMemberId }
}
