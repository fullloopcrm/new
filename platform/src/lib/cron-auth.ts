import { NextResponse } from 'next/server'
import { safeEqual } from './secret-compare'

/**
 * Fail-closed CRON_SECRET check for cron/system routes authenticated by a
 * bare `Authorization: Bearer <CRON_SECRET>` compare.
 *
 * Without this, `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` silently
 * becomes `authHeader !== 'Bearer undefined'` when CRON_SECRET is unset in an
 * environment — so a request literally sending `Authorization: Bearer undefined`
 * would pass. Rejecting up front (500, before the compare) closes that gap
 * instead of leaving auth armed with an empty/misconfigured secret.
 *
 * The header compare itself is constant-time — a plain `!==` early-exits on
 * the first mismatched character, letting an attacker recover CRON_SECRET
 * byte-by-byte from response latency across the 30+ routes that share this
 * helper.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization') || ''
  if (!safeEqual(authHeader, `Bearer ${secret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
