import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runSeoAlerts } from '@/lib/seo/alerts'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// SIGNAL alerts cron — vercel.json has scheduled this path (weekly, Tue
// 8:15am) since before the route file existed; bsr/crm-03 2026-07-31 found
// it was 404ing every week, meaning no critical seo_issues (e.g. site_down)
// ever got pushed to the owner. See src/lib/seo/alerts.ts.
export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError
  try {
    const summary = await runSeoAlerts()
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
