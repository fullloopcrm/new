import { NextResponse } from 'next/server'
import { runFleetHealth } from '@/lib/seo/health'
import { safeEqual } from '@/lib/secret-compare'
import { alertOwner } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || !safeEqual(request.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const summary = await runFleetHealth()
    if (summary.down.length > 0) {
      const body = summary.down
        .map((d) => `• ${d.domain}: HTTP ${d.status}${d.vercelError ? ` (${d.vercelError})` : ''}`)
        .join('\n')
      await alertOwner(`🚨 seomgr: ${summary.down.length} tenant site(s) DOWN`, body).catch(() => {})
    }
    return NextResponse.json({ ok: true, ...summary })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
