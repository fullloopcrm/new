import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runIndexCliffCheck } from '@/lib/seo/index-cliff'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Higher than seo-detect/seo-health's 120s -- index-cliff pages through
// seo_metrics 1000 rows at a time (Supabase's response cap, see
// index-cliff.ts), which for two 7-day windows platform-wide is roughly
// 130-140 sequential requests. Matches seo-ingest/seo-technical's budget.
export const maxDuration = 300

// SIGNAL index-cliff cron — vercel.json has scheduled this path (weekly, Tue
// 8am) since before the route file existed; bsr/crm-03 2026-07-31 found it
// was 404ing every week. See src/lib/seo/index-cliff.ts for the detection
// logic. Read-heavy against seo_metrics; writes only seo_issues.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const summary = await runIndexCliffCheck()
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
