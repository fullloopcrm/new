import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

type FeedRow = {
  id: string
  rank: number
  score: number
  band: 'hot' | 'warm' | 'cold' | 'dead'
  visitor_name: string | null
  anonymous: boolean
  zip: string | null
  device: string | null
  source_domain: string | null
  source_path: string | null
  source_kind: 'search' | 'referrer' | 'direct'
  intent_action: string
  intent_meta: string | null
  intent_warn: boolean
  time_label: string
  time_sub: string | null
  is_live: boolean
  status: 'browsing' | 'form' | 'contacted' | 'quoted' | 'booked' | 'dead'
  conv_kind: 'auto' | 'manual' | null
}

function parseHost(url: string | null): { host: string | null; path: string | null } {
  if (!url) return { host: null, path: null }
  try {
    const u = new URL(url)
    return { host: u.hostname.replace(/^www\./, ''), path: u.pathname || '/' }
  } catch {
    return { host: null, path: url }
  }
}

function bandFromScore(s: number): FeedRow['band'] {
  if (s >= 70) return 'hot'
  if (s >= 45) return 'warm'
  if (s >= 25) return 'cold'
  return 'dead'
}

function relTime(ts: string): { label: string; sub: string | null; isLive: boolean } {
  const ms = Date.now() - new Date(ts).getTime()
  if (ms < 60_000 * 5) return { label: 'now', sub: null, isLive: true }
  const min = Math.round(ms / 60_000)
  if (min < 60) return { label: `${min}m ago`, sub: null, isLive: false }
  const hr = Math.round(ms / 3_600_000)
  if (hr < 24) return { label: `${hr}h ago`, sub: null, isLive: false }
  const days = Math.round(ms / 86_400_000)
  return { label: `${days}d ago`, sub: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), isLive: false }
}

export async function GET(_request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayStartIso = todayStart.toISOString()
    const oneDayAgo = new Date(Date.now() - 86_400_000).toISOString()

    const [clicksRes, leadsRes, bookingsRes, clientsRes] = await Promise.all([
      supabaseAdmin
        .from('lead_clicks')
        .select('id, ref_code, action, session_id, device, page, referrer_url, metadata, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseAdmin
        .from('clients')
        .select('id, name, email, phone, address, source, status, created_at, notes')
        .eq('tenant_id', tenantId)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('bookings')
        .select('id, client_id, price, payment_status, status, start_time, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', sevenDaysAgo),
      supabaseAdmin
        .from('clients')
        .select('id, name, source, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', oneDayAgo),
    ])

    const clicks = (clicksRes.data || []) as Array<Record<string, unknown>>
    const recentLeads = (leadsRes.data || []) as Array<Record<string, unknown>>
    const bookings = (bookingsRes.data || []) as Array<Record<string, unknown>>
    const todayClients = (clientsRes.data || []) as Array<Record<string, unknown>>

    // Visitor feed — combine recent leads (named) + recent click sessions (anonymous).
    const feed: FeedRow[] = []
    let rank = 0

    // Named leads first.
    for (const c of recentLeads.slice(0, 12)) {
      rank += 1
      const stage = (c.status as string) || 'active'
      let status: FeedRow['status'] = 'browsing'
      let intentAction = 'Visited site'
      let intentMeta: string | null = null
      let convKind: FeedRow['conv_kind'] = null
      const cBookings = bookings.filter((b) => b.client_id === c.id)
      const paid = cBookings.find((b) => b.payment_status === 'paid')
      const upcoming = cBookings.find((b) => new Date(b.start_time as string).getTime() > Date.now())
      if (paid) {
        status = 'booked'
        intentAction = `Paid · $${Math.round(Number(paid.price || 0) / 100)}`
        convKind = 'auto'
      } else if (upcoming) {
        status = 'booked'
        const dt = new Date(upcoming.start_time as string)
        intentAction = `Booked · ${dt.toLocaleDateString('en-US', { weekday: 'short' })} ${dt.toLocaleTimeString('en-US', { hour: 'numeric' })}`
        convKind = 'auto'
      } else if (cBookings.length > 0) {
        status = 'quoted'
        intentAction = `Quoted · $${Math.round(Number(cBookings[0].price || 0) / 100)}`
        convKind = 'auto'
      } else if (c.phone) {
        status = 'contacted'
        intentAction = 'Selena reached out'
        convKind = 'auto'
      }
      const created = c.created_at as string
      const t = relTime(created)
      const score =
        status === 'booked' ? 94
          : status === 'quoted' ? 68
            : status === 'contacted' ? 56
              : 42
      const addr = (c.address as string) || ''
      const zipMatch = addr.match(/\b\d{5}\b/)
      feed.push({
        id: c.id as string,
        rank,
        score,
        band: bandFromScore(score),
        visitor_name: (c.name as string) || null,
        anonymous: false,
        zip: zipMatch?.[0] ?? null,
        device: null,
        source_domain: null,
        source_path: (c.source as string) || null,
        source_kind: 'direct',
        intent_action: intentAction,
        intent_meta: intentMeta,
        intent_warn: stage === 'lead' && !cBookings.length,
        time_label: t.label,
        time_sub: t.sub,
        is_live: false,
        status,
        conv_kind: convKind,
      })
    }

    // Anonymous live click sessions — group by session_id, show most recent.
    const seenSessions = new Set<string>()
    for (const click of clicks) {
      const sid = (click.session_id as string | null) || (click.id as string)
      if (seenSessions.has(sid)) continue
      seenSessions.add(sid)
      if (feed.length >= 24) break
      rank += 1
      const ref = parseHost(click.referrer_url as string | null)
      const page = parseHost(click.page as string | null)
      const t = relTime(click.created_at as string)
      const action = (click.action as string) || 'page_view'
      let status: FeedRow['status'] = 'browsing'
      let score = 28
      if (action === 'cta_click' || action === 'form_start') {
        status = 'form'
        score = 62
      } else if (page.path && /\bpricing|book|quote\b/i.test(page.path)) {
        score = 48
      }
      feed.push({
        id: click.id as string,
        rank,
        score,
        band: bandFromScore(score),
        visitor_name: null,
        anonymous: true,
        zip: null,
        device: (click.device as string) || null,
        source_domain: page.host,
        source_path: ref.host ? ref.host : page.path,
        source_kind: ref.host ? 'referrer' : (page.path?.match(/utm_|q=/) ? 'search' : 'direct'),
        intent_action: action === 'form_start' ? 'On form' : `On ${page.path || 'site'}`,
        intent_meta: null,
        intent_warn: false,
        time_label: t.label,
        time_sub: t.sub,
        is_live: t.isLive,
        status,
        conv_kind: null,
      })
    }

    // Funnel — last 7 days.
    const visitors = new Set(clicks.map((c) => (c.session_id as string) || (c.id as string))).size
    const formStarts = clicks.filter((c) => (c.action as string) === 'form_start').length
    const formSubmits = clicks.filter((c) => (c.action as string) === 'form_submit').length || recentLeads.length
    const contacted = recentLeads.filter((c) => bookings.some((b) => b.client_id === c.id) || (c.phone as string)).length
    const quoted = bookings.length
    const booked = bookings.filter((b) => (b.status as string) !== 'cancelled').length
    const showed = bookings.filter((b) => (b.status as string) === 'completed').length
    const paid = bookings.filter((b) => (b.payment_status as string) === 'paid').length

    // Channel mix — utm_source from metadata, fallback to referrer host heuristic.
    const channels: Record<string, number> = { organic: 0, referral: 0, direct: 0, social: 0, paid: 0 }
    for (const c of clicks) {
      const meta = (c.metadata as Record<string, unknown> | null) || {}
      const utm = (meta.utm_source as string | null) || ''
      const ref = parseHost(c.referrer_url as string | null).host
      if (/google|bing|duckduckgo/i.test(utm + ref)) channels.organic += 1
      else if (/facebook|instagram|twitter|tiktok/i.test(utm + ref)) channels.social += 1
      else if (utm === 'paid' || /ads|google_ads/i.test(utm)) channels.paid += 1
      else if (ref) channels.referral += 1
      else channels.direct += 1
    }
    const channelTotal = Object.values(channels).reduce((s, n) => s + n, 0) || 1

    // Top domains — group clicks by parsed page host.
    const domainMap = new Map<string, { count: number; lastTs: string }>()
    for (const c of clicks) {
      const host = parseHost(c.page as string).host
      if (!host) continue
      const cur = domainMap.get(host) || { count: 0, lastTs: '' }
      cur.count += 1
      cur.lastTs = (c.created_at as string) > cur.lastTs ? (c.created_at as string) : cur.lastTs
      domainMap.set(host, cur)
    }
    const topDomains = [...domainMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6)
      .map(([host, v], i) => ({ rank: String(i + 1).padStart(2, '0'), domain: host, leads: v.count, last_ts: v.lastTs }))

    // Outlook stats.
    const liveNow = feed.filter((r) => r.is_live).length
    const todayVisits = clicks.filter((c) => (c.created_at as string) >= todayStartIso).length
    const todayLeads = todayClients.length
    const conversion = todayVisits > 0 ? Math.round((todayLeads / todayVisits) * 1000) / 10 : 0
    const ltvSum = bookings.reduce((s, b) => s + (Number(b.price || 0)), 0)
    const avgLtvCents = recentLeads.length > 0 ? Math.round(ltvSum / recentLeads.length) : 0

    return NextResponse.json({
      feed,
      stats: {
        live_now: liveNow,
        visits_today: todayVisits,
        leads_today: todayLeads,
        conversion_pct: conversion,
        time_to_contact_seconds: null, // selena conversation timing — placeholder
        booked_from_leads: booked,
        lead_to_book_pct: recentLeads.length > 0 ? Math.round((booked / recentLeads.length) * 1000) / 10 : 0,
        avg_ltv_cents: avgLtvCents,
      },
      funnel: {
        visitors,
        form_starts: formStarts,
        form_submits: formSubmits,
        contacted,
        quoted,
        booked,
        showed,
        paid,
      },
      channels: {
        organic_pct: Math.round((channels.organic / channelTotal) * 100),
        referral_pct: Math.round((channels.referral / channelTotal) * 100),
        direct_pct: Math.round((channels.direct / channelTotal) * 100),
        social_pct: Math.round((channels.social / channelTotal) * 100),
        paid_pct: Math.round((channels.paid / channelTotal) * 100),
      },
      top_domains: topDomains,
      // Search queries + TTC distribution + geo: data not yet collected — return empty, page renders empty state.
      top_queries: [] as Array<{ query: string; count: number; trend: 'up' | 'down' | 'flat' }>,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ error: 'Failed to fetch leads feed' }, { status: 500 })
  }
}
