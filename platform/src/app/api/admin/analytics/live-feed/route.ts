import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'

// Live visitor feed for the tenant's tracked sites. Ported from nycmaid
// admin/analytics/live-feed, tenant-scoped for FullLoop (filters lead_clicks by
// tenant_id — nycmaid was single-tenant). Returns the most recent visit events,
// bot-filtered, capped at LIMIT.

const LIMIT = 100
const RAW_FETCH = 400

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|Mediapartners|AdsBot|Lighthouse|Headless|PhantomJS|wget|curl|python|httpx|node-fetch|Go-http|Java\/|Screaming|Ahrefs|SEMrush|Moz\/|DotBot|Bytespider|GPTBot|ClaudeBot|Barkrowler|BLEXBot|DataForSeo|PetalBot|MJ12bot|YandexBot|Applebot/i

interface LiveVisit {
  time: string
  domain: string
  page: string
  referrer: string
  device: string
  time_on_page: number
  scroll_depth: number
}

export async function GET() {
  const { tenant: ctx, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError
  const { tenantId } = ctx

  try {
    const { data, error } = await supabaseAdmin
      .from('lead_clicks')
      .select('created_at, domain, page, referrer, device, final_time, time_on_page, final_scroll, scroll_depth, user_agent')
      .eq('tenant_id', tenantId)
      .eq('action', 'visit')
      .order('created_at', { ascending: false })
      .limit(RAW_FETCH)

    if (error) throw error

    const visits: LiveVisit[] = (data || [])
      .filter((r: Record<string, unknown>) => {
        const ua = (r.user_agent as string) || ''
        if (!ua) return true // keep rows without UA (older data)
        return !BOT_PATTERN.test(ua)
      })
      .slice(0, LIMIT)
      .map((r: Record<string, unknown>) => ({
        time: r.created_at as string,
        domain: ((r.domain as string) || 'unknown').replace(/^www\./, ''),
        page: (r.page as string) || '/',
        referrer: (r.referrer as string) || '',
        device: (r.device as string) || 'unknown',
        time_on_page: (r.final_time as number) || (r.time_on_page as number) || 0,
        scroll_depth: (r.final_scroll as number) || (r.scroll_depth as number) || 0,
      }))

    return NextResponse.json({ visits, count: visits.length })
  } catch (err) {
    console.error('Live feed GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch live feed' }, { status: 500 })
  }
}
