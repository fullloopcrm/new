/**
 * Constant-time string compare for secrets (CRON_SECRET, API keys, etc).
 *
 * A naive `===`/`!==` compare leaks secret bytes via timing, letting an
 * attacker recover the secret byte-by-byte and forge requests to whatever
 * the secret gates. Same convention as internal/deploy-hook and
 * email/monitor (see 101b009f).
 */
import { timingSafeEqual } from 'crypto'

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}
