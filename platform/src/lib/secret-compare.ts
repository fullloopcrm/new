import crypto from 'crypto'

/**
 * Constant-time equality for secrets (API keys, admin passwords, monitor
 * keys) compared with plain `===` elsewhere in the codebase. Mirrors the
 * length-guarded `crypto.timingSafeEqual` pattern already used for HMAC
 * signatures (webhook-verify.ts, portal/team-portal token verify,
 * referrer-portal-auth.ts, impersonation.ts) so a mistyped or unconfigured
 * secret can't be brute-forced via response-time measurement.
 *
 * Returns false (never throws) when either value is missing/empty, so
 * callers can pass `undefined` env vars straight through without a
 * separate presence check.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

/**
 * HMAC-SHA256 sign `payload` with `secret`. Throws if secret is empty/unset —
 * several call sites used to fall back to `secret || ''` (or a literal
 * fallback string), which HMAC-keys with a publicly-computable value: with
 * the real secret unconfigured, anyone can compute the same signature and
 * forge a valid session/token with zero credentials. Failing closed here
 * means an unconfigured secret produces no valid signature at all, not an
 * insecure one.
 */
export function signWithSecret(payload: string, secret: string | null | undefined): string {
  if (!secret) {
    throw new Error('Cannot sign: secret is not configured')
  }
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}
