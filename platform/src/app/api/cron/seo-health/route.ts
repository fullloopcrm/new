import { NextResponse } from 'next/server'
import { runFleetHealth } from '@/lib/seo/health'
import { safeEqual } from '@/lib/timing-safe-equal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

// seomgr fleet health cron -- health.ts's runFleetHealth() existed with no
// caller anywhere in the codebase (test-only). HTTP-checks every active
// tenant public domain and persists DOWN sites as critical seo_issues
// (site_down), which cron/seo-alerts then diffs and pages Jeff for. Must run
// before seo-alerts so a fresh site_down issue exists to alert on.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !process.env.CRON_SECRET || !safeEqual(authHeader, `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runFleetHealth()
    return NextResponse.json({ ok: true, checked: result.checked, down: result.down.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
