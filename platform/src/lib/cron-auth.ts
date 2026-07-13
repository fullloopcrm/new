import { NextResponse } from 'next/server'

/**
 * Fail-closed CRON_SECRET check for cron/system routes authenticated by a
 * bare `Authorization: Bearer <CRON_SECRET>` compare.
 *
 * Without this, `authHeader !== \`Bearer ${process.env.CRON_SECRET}\`` silently
 * becomes `authHeader !== 'Bearer undefined'` when CRON_SECRET is unset in an
 * environment — so a request literally sending `Authorization: Bearer undefined`
 * would pass. Rejecting up front (500, before the compare) closes that gap
 * instead of leaving auth armed with an empty/misconfigured secret.
 */
export function verifyCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET not set' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
