import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Constant-time string compare for secrets (API keys, PINs, shared tokens).
 * A plain `===`/`!==` short-circuits on the first mismatched byte, which is
 * the textbook timing side-channel — an attacker can recover the secret
 * character-by-character from response latency. Also rejects empty operands
 * so an unset expected-secret env var can never be satisfied by an empty
 * submitted value.
 */
export function safeEqual(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
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
  return createHmac('sha256', secret).update(payload).digest('hex')
}
