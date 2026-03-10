import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  // All visits across all tenants
  const { data: allVisits } = await supabaseAdmin
    .from('website_visits')
    .select('id, tenant_id, session_id, visitor_id, referrer, device, page_url, scroll_depth, time_on_page, cta_type, action, active_time, cta_clicked, utm_source, utm_medium, utm_campaign, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  const visits = allVisits || []

  // Split into page views and CTA events
  const pageViews = visits.filter(v => v.action === 'visit' || !v.action)
  const ctaEvents = visits.filter(v => v.cta_type)

  // Live feed — visits only, newest first
  const liveFeed = pageViews.slice(0, 500).map(v => ({
    id: v.id,
    tenant_id: v.tenant_id,
    device: v.device || '',
    referrer: v.referrer || null,
    page_url: v.page_url || '/',
    scroll_depth: v.scroll_depth || 0,
    time_on_page: v.time_on_page || 0,
    active_time: v.active_time || 0,
    cta_clicked: v.cta_clicked || false,
    cta_type: v.cta_type || null,
    utm_source: v.utm_source || null,
    utm_medium: v.utm_medium || null,
    utm_campaign: v.utm_campaign || null,
    created_at: v.created_at,
  }))

  // Dashboard — visitor counts by time period
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const dayOfWeek = now.getDay() || 7
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 1).getTime()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const startOfYear = new Date(now.getFullYear(), 0, 1).getTime()

  let today = 0, thisWeek = 0, thisMonth = 0, thisYear = 0
  for (const v of pageViews) {
    const t = new Date(v.created_at).getTime()
    if (t >= startOfToday) today++
    if (t >= startOfWeek) thisWeek++
    if (t >= startOfMonth) thisMonth++
    if (t >= startOfYear) thisYear++
  }

  // CTA stats — unique sessions per CTA type
  const callSessions = new Set(ctaEvents.filter(v => v.cta_type === 'call').map(v => v.session_id).filter(Boolean))
  const textSessions = new Set(ctaEvents.filter(v => v.cta_type === 'text').map(v => v.session_id).filter(Boolean))
  const bookSessions = new Set(ctaEvents.filter(v => v.cta_type === 'book').map(v => v.session_id).filter(Boolean))
  const totalCalls = callSessions.size
  const totalTexts = textSessions.size
  const totalBooks = bookSessions.size
  const totalCtas = totalCalls + totalTexts + totalBooks
  const totalVisitors = pageViews.length
  const conversionPct = totalVisitors > 0 ? parseFloat(((totalCtas / totalVisitors) * 100).toFixed(1)) : 0

  // CTA details — one record per unique session_id:cta_type pair
  const ctaSeenKeys = new Set<string>()
  const ctaDetails: { session_id: string; action: string; referrer: string | null; device: string; tenant_id: string; created_at: string }[] = []
  for (const v of ctaEvents) {
    if (!v.session_id || !v.cta_type) continue
    const key = `${v.session_id}:${v.cta_type}`
    if (ctaSeenKeys.has(key)) continue
    ctaSeenKeys.add(key)
    ctaDetails.push({
      session_id: v.session_id,
      action: v.cta_type,
      referrer: v.referrer || null,
      device: v.device || '',
      tenant_id: v.tenant_id,
      created_at: v.created_at,
    })
  }

  // Tenant breakdown
  const tenantStats: Record<string, { visits: number; ctas: number }> = {}
  for (const v of pageViews) {
    if (!tenantStats[v.tenant_id]) tenantStats[v.tenant_id] = { visits: 0, ctas: 0 }
    tenantStats[v.tenant_id].visits++
  }
  for (const v of ctaEvents) {
    if (!tenantStats[v.tenant_id]) tenantStats[v.tenant_id] = { visits: 0, ctas: 0 }
    tenantStats[v.tenant_id].ctas++
  }

  // Get tenant names
  const tenantIds = Object.keys(tenantStats)
  const { data: tenantRows } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .in('id', tenantIds)

  const tenantNameMap: Record<string, string> = {}
  for (const t of (tenantRows || [])) {
    tenantNameMap[t.id] = t.name
  }

  const tenants = Object.entries(tenantStats)
    .map(([id, s]) => ({ id, name: tenantNameMap[id] || id.slice(0, 8), visits: s.visits, ctas: s.ctas }))
    .sort((a, b) => b.visits - a.visits)

  const dashboard = {
    today, thisWeek, thisMonth, thisYear, allTime: totalVisitors,
    conversionPct, totalTexts, totalCalls, totalBooks, totalCtas,
  }

  return NextResponse.json({ dashboard, liveFeed, ctaDetails, tenants })
}
