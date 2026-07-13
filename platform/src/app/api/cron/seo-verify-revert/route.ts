import { NextResponse } from 'next/server'
import { runVerifyRevert } from '@/lib/seo/verify-revert'
import { verifyCronSecret } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// SIGNAL verify-and-revert — weekly. Judges autopilot changes past the verify
// window against their live position and rolls back clear regressions. Safe to
// run regardless of the autopilot flag; it only ever touches autopilot changes.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const result = await runVerifyRevert()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
