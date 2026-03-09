import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — authenticated visit feed for dashboard
export async function GET(request: NextRequest) {
  const { getTenantForRequest, AuthError } = await import('@/lib/tenant-query')
  try {
    const { tenantId } = await getTenantForRequest()

    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'week'

    // Date filter
    const now = new Date()
    let since = new Date()
    if (period === 'today') since.setHours(0, 0, 0, 0)
    else if (period === 'week') since.setDate(now.getDate() - 7)
    else if (period === 'month') since.setDate(now.getDate() - 30)
    else since.setDate(now.getDate() - 7)

    // All visits in period
    const { data: visits } = await supabaseAdmin
      .from('website_visits')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(500)

    const allVisits = visits || []

    // Compute stats
    const pageViews = allVisits.filter((v) => v.action === 'visit' || !v.action)
    const ctaEvents = allVisits.filter((v) => v.cta_type)
    const uniqueSessions = new Set(allVisits.map((v) => v.session_id).filter(Boolean))
    const uniqueVisitors = new Set(allVisits.map((v) => v.visitor_id).filter(Boolean))

    // Device breakdown
    const devices: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 }
    pageViews.forEach((v) => {
      const d = v.device || 'desktop'
      devices[d] = (devices[d] || 0) + 1
    })

    // CTA breakdown
    const ctaBreakdown: Record<string, number> = {}
    ctaEvents.forEach((v) => {
      const t = v.cta_type || 'unknown'
      ctaBreakdown[t] = (ctaBreakdown[t] || 0) + 1
    })

    // Average engagement
    const leaveEvents = allVisits.filter((v) => v.action === 'leave' && v.time_on_page)
    const avgTime = leaveEvents.length > 0
      ? Math.round(leaveEvents.reduce((s, v) => s + (v.time_on_page || 0), 0) / leaveEvents.length)
      : 0
    const avgScroll = leaveEvents.length > 0
      ? Math.round(leaveEvents.reduce((s, v) => s + (v.scroll_depth || 0), 0) / leaveEvents.length)
      : 0

    // Bounce rate (sessions with only 1 page view, < 10s)
    const sessionViews: Record<string, number> = {}
    const sessionTimes: Record<string, number> = {}
    allVisits.forEach((v) => {
      if (!v.session_id) return
      sessionViews[v.session_id] = (sessionViews[v.session_id] || 0) + 1
      if (v.time_on_page && (!sessionTimes[v.session_id] || v.time_on_page > sessionTimes[v.session_id])) {
        sessionTimes[v.session_id] = v.time_on_page
      }
    })
    const totalSessions = Object.keys(sessionViews).length
    const bounceSessions = Object.entries(sessionViews).filter(
      ([sid, count]) => count <= 1 && (sessionTimes[sid] || 0) < 10
    ).length
    const bounceRate = totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0

    // Conversion rate (sessions with CTA / total sessions)
    const ctaSessions = new Set(ctaEvents.map((v) => v.session_id).filter(Boolean))
    const convRate = uniqueSessions.size > 0
      ? Math.round((ctaSessions.size / uniqueSessions.size) * 100)
      : 0

    // Top pages
    const pageCounts: Record<string, number> = {}
    pageViews.forEach((v) => {
      const p = v.page_url || '/'
      pageCounts[p] = (pageCounts[p] || 0) + 1
    })
    const topPages = Object.entries(pageCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Referrer breakdown
    const refCounts: Record<string, number> = {}
    pageViews.forEach((v) => {
      const ref = v.referrer || 'Direct'
      let source = 'Direct'
      if (ref.includes('google')) source = 'Google'
      else if (ref.includes('bing')) source = 'Bing'
      else if (ref.includes('chatgpt') || ref.includes('openai')) source = 'ChatGPT'
      else if (ref.includes('facebook') || ref.includes('fb.')) source = 'Facebook'
      else if (ref.includes('instagram')) source = 'Instagram'
      else if (ref.includes('yelp')) source = 'Yelp'
      else if (ref.includes('tiktok')) source = 'TikTok'
      else if (ref.includes('twitter') || ref.includes('x.com')) source = 'X/Twitter'
      else if (ref.includes('nextdoor')) source = 'Nextdoor'
      else if (ref !== 'Direct') source = ref
      refCounts[source] = (refCounts[source] || 0) + 1
    })
    const sources = Object.entries(refCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)

    // Recent feed (last 50 visits and CTAs)
    const feed = allVisits
      .filter((v) => v.action === 'visit' || v.action === 'cta' || !v.action)
      .slice(0, 50)

    return NextResponse.json({
      stats: {
        pageViews: pageViews.length,
        sessions: uniqueSessions.size,
        visitors: uniqueVisitors.size,
        ctas: ctaEvents.length,
        avgTime,
        avgScroll,
        bounceRate,
        convRate,
      },
      devices,
      ctaBreakdown,
      topPages,
      sources,
      feed,
    })
  } catch (e) {
    if (e instanceof (await import('@/lib/tenant-query')).AuthError) {
      return NextResponse.json({ error: (e as Error).message }, { status: 401 })
    }
    throw e
  }
}

// POST — public tracking pixel endpoint (called by t.js)
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let body: Record<string, unknown>

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text()
      body = JSON.parse(text)
    }

    const {
      tenant_id, session_id, visitor_id, referrer, device,
      page_url, scroll_depth, time_on_page, cta_type, action,
      active_time, cta_clicked, load_time_ms, placement,
      screen_w, screen_h, utm_source, utm_medium, utm_campaign,
    } = body as Record<string, string | number | boolean | null>

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
    }

    await supabaseAdmin
      .from('website_visits')
      .insert({
        tenant_id,
        session_id: session_id || null,
        visitor_id: visitor_id || null,
        referrer: referrer || null,
        device: device || null,
        page_url: page_url || null,
        scroll_depth: scroll_depth != null ? Number(scroll_depth) : null,
        time_on_page: time_on_page != null ? Number(time_on_page) : null,
        cta_type: cta_type || null,
        action: action || 'visit',
        active_time: active_time != null ? Number(active_time) : null,
        cta_clicked: cta_clicked || false,
        load_time_ms: load_time_ms != null ? Number(load_time_ms) : null,
        placement: placement || null,
        screen_w: screen_w != null ? Number(screen_w) : null,
        screen_h: screen_h != null ? Number(screen_h) : null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      })

    // Return 1x1 transparent pixel for image fallback
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}

// OPTIONS — CORS preflight for cross-origin tracking
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
