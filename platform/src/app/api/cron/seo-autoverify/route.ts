import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runAutoVerify } from '@/lib/seo/auto-verify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// seomgr auto-verify cron. Guard-railed end to end:
//  - CRON_SECRET required.
//  - runAutoVerify() runs DRY unless SEOMGR_AUTOVERIFY_ENABLED === 'true'.
//  - allowlist + rate cap + idempotency enforced inside runAutoVerify().
// Safe to schedule immediately: it no-ops (dry) until explicitly armed.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const summary = await runAutoVerify()
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
