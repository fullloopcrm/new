import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  // Get tenant domains
  let domainsQuery = supabaseAdmin
    .from('tenant_domains')
    .select('*, tenants(name)')
    .order('created_at', { ascending: false })

  if (tenantId) domainsQuery = domainsQuery.eq('tenant_id', tenantId)

  const { data: domains } = await domainsQuery

  // Get website visit stats per tenant
  let visitsQuery = supabaseAdmin
    .from('website_visits')
    .select('tenant_id, action, cta_type, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (tenantId) visitsQuery = visitsQuery.eq('tenant_id', tenantId)

  const { data: visits } = await visitsQuery

  const allVisits = visits || []
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  const pageViews = allVisits.filter(v => v.action === 'visit' || !v.action)
  const ctaEvents = allVisits.filter(v => v.cta_type)

  const stats = {
    totalVisits: pageViews.length,
    todayVisits: pageViews.filter(v => new Date(v.created_at).getTime() >= todayStart).length,
    monthVisits: pageViews.filter(v => new Date(v.created_at).getTime() >= monthStart).length,
    totalCtas: ctaEvents.length,
  }

  // Per-tenant website summary
  const tenantStats: Record<string, { visits: number; ctas: number }> = {}
  for (const v of pageViews) {
    if (!tenantStats[v.tenant_id]) tenantStats[v.tenant_id] = { visits: 0, ctas: 0 }
    tenantStats[v.tenant_id].visits++
  }
  for (const v of ctaEvents) {
    if (!tenantStats[v.tenant_id]) tenantStats[v.tenant_id] = { visits: 0, ctas: 0 }
    tenantStats[v.tenant_id].ctas++
  }

  return NextResponse.json({
    domains: domains || [],
    stats,
    tenantStats,
  })
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenant_id, domain, is_primary } = await request.json()

  if (!tenant_id || !domain) {
    return NextResponse.json({ error: 'tenant_id and domain are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .insert({ tenant_id, domain, is_primary: is_primary || false })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ domain: data }, { status: 201 })
}
