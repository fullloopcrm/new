import { NextResponse } from 'next/server'
import { runAutoVerify } from '@/lib/seo/auto-verify'
import { safeEqual } from '@/lib/timing-safe-equal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// seomgr auto-verify cron. Guard-railed end to end:
//  - CRON_SECRET required.
//  - runAutoVerify() runs DRY unless SEOMGR_AUTOVERIFY_ENABLED === 'true'.
//  - allowlist + rate cap + idempotency enforced inside runAutoVerify().
// Safe to schedule immediately: it no-ops (dry) until explicitly armed.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
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
