/**
 * Shared helpers for comparing/signing with server-side secrets (ADMIN_PASSWORD,
 * cron keys, etc). Centralizes two bug classes found repeatedly across the
 * codebase: (1) `secret === userInput` timing side-channels, and (2) HMAC keys
 * that silently fall back to `''` when the env var is unset — an empty HMAC
 * key is publicly computable, so that "fallback" is a full auth bypass, not
 * a safe default.
 */
import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Constant-time string comparison. Returns false for empty/missing operands —
 * an empty expected or actual value must never compare equal, even to itself.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

/**
 * HMAC-SHA256 sign `payload` with `secret`. Throws if secret is empty/unset —
 * callers must fail closed instead of signing with a publicly-known empty key.
 */
export function signWithSecret(payload: string, secret: string | null | undefined): string {
  if (!secret) {
    throw new Error('Cannot sign: secret is not configured')
  }
  return createHmac('sha256', secret).update(payload).digest('hex')
}
