import { NextResponse } from 'next/server'
import { checkCriticalSeoAlerts } from '@/lib/seo/alerts'
import { safeEqual } from '@/lib/timing-safe-equal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Runs after seo-health (and, once shipped, the indexation-cliff detector)
// have written any critical seo_issues rows — diffs them against the last
// alert and pages Jeff via Jefe/Telegram for anything new. NOT YET wired
// into vercel.json — add alongside seo-health when that ships (SEOMGR-NEXT-SESSION.md step 1).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await checkCriticalSeoAlerts()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
