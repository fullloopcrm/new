import { NextResponse } from 'next/server'
import { runFleetHealth, runCanaryHealth } from '@/lib/seo/health'
import { safeEqual } from '@/lib/secret-compare'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || !safeEqual(request.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const [fleet, canary] = await Promise.all([runFleetHealth(), runCanaryHealth()])
    return NextResponse.json({ ok: true, fleet, canary })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
