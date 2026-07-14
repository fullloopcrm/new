import { timingSafeEqual } from 'crypto'

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
