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
