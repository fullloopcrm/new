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

  // Normalize to the SAME host form the resolver looks up at request time
  // (getTenantByDomain in tenant-lookup.ts / tenant.ts: lowercase, strip
  // www.) and the same form activate-tenant.ts already writes for
  // auto-registered domains (also strips a pasted protocol/path). Without
  // this, an admin typing "https://WWW.Acme.com/" here stores that exact
  // string; the resolver's `.eq('domain', cleanDomain)` is an exact
  // case-sensitive match against "acme.com" and never finds this row, so the
  // domain silently never routes even though it looks configured in the UI.
  const cleanDomain = String(domain)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '')

  if (!cleanDomain) {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 })
  }

  // Demote this tenant's existing primary (if any) BEFORE inserting a new
  // one flagged is_primary — the table has no DB constraint stopping two
  // active is_primary=true rows from coexisting per tenant, and until now
  // nothing in the app enforced it either. Every "primary domain" resolver
  // (getPrimaryTenantDomain in domains.ts — which feeds tenantSiteUrl(),
  // tenantBrand(), the SELENA agent's brand override, and resolveOrigin();
  // plus referrers/[code], site-export, cron/tenant-health) picks whichever
  // row an unordered query happens to return first, so a second live primary
  // makes which domain "wins" for invoice/quote/document send links and SMS
  // branding non-deterministic instead of just wrong. Same demote-before-set
  // pattern already used for client_contacts.is_primary / client_properties.is_primary.
  if (is_primary) {
    const { error: demoteError } = await supabaseAdmin
      .from('tenant_domains')
      .update({ is_primary: false })
      .eq('tenant_id', tenant_id)
      .eq('is_primary', true)

    if (demoteError) {
      return NextResponse.json({ error: demoteError.message }, { status: 500 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .insert({ tenant_id, domain: cleanDomain, is_primary: is_primary || false })
    .select()
    .single()

  if (error) {
    // tenant_domains.domain is UNIQUE at the DB level (migrations/
    // 043_tenant_domains.sql) — the only real reason this insert 23505s is a
    // domain already claimed by SOME tenant (possibly this one, re-adding).
    // Previously surfaced the raw Postgres message ("duplicate key value
    // violates unique constraint...") straight to the admin's alert() —
    // technically correct but tells them nothing actionable. Same pattern
    // already used for comhub_threads.slug's 23505 in
    // admin/comhub/channels/route.ts.
    if (error.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('tenant_domains')
        .select('tenant_id')
        .eq('domain', cleanDomain)
        .maybeSingle()

      if (existing?.tenant_id === tenant_id) {
        return NextResponse.json(
          { error: `${cleanDomain} is already registered to this tenant.` },
          { status: 409 },
        )
      }

      let ownerName: string | null = null
      if (existing?.tenant_id) {
        const { data: ownerTenant } = await supabaseAdmin
          .from('tenants')
          .select('name')
          .eq('id', existing.tenant_id)
          .maybeSingle()
        ownerName = ownerTenant?.name ?? null
      }

      return NextResponse.json(
        {
          error: ownerName
            ? `${cleanDomain} is already registered to ${ownerName}. Remove it there first, or reassign it, before adding it here.`
            : `${cleanDomain} is already registered to another tenant.`,
        },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bust tenant-lookup.ts's edge cache for this exact domain string. A host
  // that ever resolved (or 404'd) before this row existed can be negatively
  // cached — without this, the domain just registered here would keep
  // resolving to "no tenant" on a warm edge isolate for up to the rest of the
  // 5-minute TTL despite the DB row now existing.
  const { invalidateDomainCache } = await import('@/lib/tenant-lookup')
  invalidateDomainCache(cleanDomain)

  return NextResponse.json({ domain: data }, { status: 201 })
}
