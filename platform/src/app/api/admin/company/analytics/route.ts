import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

const ROW_CAP = 20_000

interface VisitRow {
  page_url: string | null
  referrer: string | null
  device: string | null
  session_id: string | null
  utm_source: string | null
  created_at: string
}

function periodSince(period: string): string {
  const now = new Date()
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (period === 'month') return new Date(now.getTime() - 30 * 86_400_000).toISOString()
  return new Date(now.getTime() - 7 * 86_400_000).toISOString() // 'week' default
}

function topN(counts: Map<string, number>, n: number): { key: string; count: number }[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }))
}

// GET /api/admin/company/analytics?period=today|week|month
export async function GET(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const period = new URL(req.url).searchParams.get('period') || 'week'
  const since = periodSince(period)

  const { data, error } = await supabaseAdmin
    .from('platform_website_visits')
    .select('page_url, referrer, device, session_id, utm_source, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(ROW_CAP)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []) as VisitRow[]
  const pageViews = rows.length
  const sessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size

  const pageCounts = new Map<string, number>()
  const referrerCounts = new Map<string, number>()
  const deviceCounts = new Map<string, number>()
  const utmSourceCounts = new Map<string, number>()

  for (const r of rows) {
    if (r.page_url) pageCounts.set(r.page_url, (pageCounts.get(r.page_url) || 0) + 1)
    let ref = 'direct'
    if (r.referrer) {
      try {
        ref = new URL(r.referrer).hostname
      } catch {
        ref = 'direct'
      }
    }
    referrerCounts.set(ref, (referrerCounts.get(ref) || 0) + 1)
    const dev = r.device || 'unknown'
    deviceCounts.set(dev, (deviceCounts.get(dev) || 0) + 1)
    if (r.utm_source) utmSourceCounts.set(r.utm_source, (utmSourceCounts.get(r.utm_source) || 0) + 1)
  }

  return NextResponse.json({
    period,
    truncated: rows.length >= ROW_CAP,
    stats: { pageViews, sessions },
    topPages: topN(pageCounts, 10),
    topReferrers: topN(referrerCounts, 10),
    devices: Object.fromEntries(deviceCounts),
    utmSources: topN(utmSourceCounts, 10),
  })
}
