/**
 * Signed, stateless token for the public /onboard/[token] link — the
 * no-login, always-autosaving onboarding questionnaire every tenant gets
 * automatically the moment they're created (see onboarding-link.ts).
 *
 * Stateless by design (no token row in the DB), same architectural style as
 * tenant-header-sig.ts's signed x-tenant-id header and the admin PIN
 * impersonation cookie. Reuses that file's HMAC-SHA256 primitives instead of
 * reimplementing SHA256 a third time.
 *
 * Payload: tenantId + the tenant's onboarding_link_version + an expiry.
 * Verification re-checks the signature AND that the version still matches
 * the tenant's CURRENT onboarding_link_version — bumping that column (see
 * admin/tenants/[id] "Regenerate link") invalidates every token minted
 * before the bump, without needing a token blocklist.
 */
import { hmacSha256, bytesToHex } from './tenant-header-sig'

const DEFAULT_TTL_DAYS = 30

function getSecret(): string {
  const s =
    process.env.ONBOARDING_TOKEN_SECRET ||
    process.env.TENANT_HEADER_SIG_SECRET ||
    process.env.ADMIN_TOKEN_SECRET ||
    process.env.PORTAL_SECRET
  if (!s) {
    throw new Error(
      'ONBOARDING_TOKEN_SECRET (or TENANT_HEADER_SIG_SECRET / ADMIN_TOKEN_SECRET / PORTAL_SECRET fallback) is required.',
    )
  }
  return s
}

interface TokenPayload {
  /** tenant id */
  t: string
  /** onboarding_link_version this token was signed with */
  v: number
  /** expiry, epoch seconds */
  e: number
  /** PIN verified — only present on the elevated token minted by /api/onboarding/pin */
  p?: 1
}

function base64urlEncode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(s: string): string | null {
  try {
    const padded = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)
    return Buffer.from(padded, 'base64').toString('utf8')
  } catch {
    return null
  }
}

/**
 * Mint a signed onboarding-link token for a tenant at its current link
 * version. Pass `pinVerified: true` to mint the elevated token
 * /api/onboarding/pin issues after a correct PIN — see onboarding-pin.ts.
 */
export function signOnboardingToken(
  tenantId: string,
  linkVersion: number,
  ttlDays: number = DEFAULT_TTL_DAYS,
  opts: { pinVerified?: boolean } = {},
): string {
  const payload: TokenPayload = {
    t: tenantId,
    v: linkVersion,
    e: Math.floor(Date.now() / 1000) + ttlDays * 86400,
    ...(opts.pinVerified ? { p: 1 } : {}),
  }
  const body = base64urlEncode(JSON.stringify(payload))
  const sig = bytesToHex(hmacSha256(getSecret(), body))
  return `${body}.${sig}`
}

export interface VerifiedOnboardingToken {
  tenantId: string
  linkVersion: number
  pinVerified: boolean
}

/**
 * Verify a token's signature and expiry. Does NOT check the token's
 * linkVersion against the tenant's current one — the caller must load the
 * tenant row and compare `onboarding_link_version` (this module has no DB
 * access), which is also what makes "regenerate link" work as revocation.
 */
export function verifyOnboardingToken(token: string | null | undefined): VerifiedOnboardingToken | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)

  const expectedSig = bytesToHex(hmacSha256(getSecret(), body))
  if (expectedSig.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < expectedSig.length; i++) diff |= expectedSig.charCodeAt(i) ^ sig.charCodeAt(i)
  if (diff !== 0) return null

  const json = base64urlDecode(body)
  if (!json) return null
  let payload: TokenPayload
  try {
    payload = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof payload.t !== 'string' || typeof payload.v !== 'number' || typeof payload.e !== 'number') return null
  if (Math.floor(Date.now() / 1000) > payload.e) return null

  return { tenantId: payload.t, linkVersion: payload.v, pinVerified: payload.p === 1 }
}
