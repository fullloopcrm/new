import { NextResponse } from 'next/server'
import { checkFleetVolatility } from '@/lib/seo/volatility'
import { safeEqual } from '@/lib/secret-compare'
import { alertOwner } from '@/lib/telegram'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || !safeEqual(request.headers.get('authorization'), `Bearer ${process.env.CRON_SECRET}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const report = await checkFleetVolatility()
    if (report.detected) {
      const moved = report.deltas
        .filter((d) => Math.abs(d.delta) >= 2)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 15)
        .map((d) => `• ${d.domain ?? d.property}: ${d.baselinePosition} → ${d.recentPosition} (${d.delta > 0 ? '+' : ''}${d.delta})`)
        .join('\n')
      const dir = report.directionality === 'worsened' ? 'worse' : report.directionality === 'improved' ? 'better' : 'mixed'
      await alertOwner(
        `📊 seomgr: possible Google algorithm rollout — ${report.moved}/${report.measured} properties moved ${dir}`,
        moved,
      ).catch(() => {})
    }
    return NextResponse.json({ ok: true, ...report })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
