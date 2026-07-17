import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { etToday, etDayBoundaryUTC } from '@/lib/recurring'
import { normalizeDomain } from '@/lib/seo/onboarding'
import { registerCustomDomain, removeDomain } from '@/lib/vercel-domains'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  // Full tenant list — powers the admin page's tenant filter/dropdown (which
  // must include tenants with zero domains yet, e.g. to add their first one)
  // and the tenant_id -> name lookup used below.
  const { data: tenantRows } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .order('name', { ascending: true })
  const tenants = tenantRows || []
  const tenantNameById = new Map(tenants.map((t) => [t.id as string, t.name as string]))

  // Get tenant domains
  let domainsQuery = supabaseAdmin
    .from('tenant_domains')
    .select('*, tenants(name)')
    .order('created_at', { ascending: false })

  if (tenantId) domainsQuery = domainsQuery.eq('tenant_id', tenantId)

  const { data: domains } = await domainsQuery
  const domainRows = domains || []

  // Real reachability/SSL signal for each domain, sourced from the Fortress
  // cron's per-domain health checks (tenant_health) rather than fabricated.
  // A successful `checks.reachable` implies the HTTPS handshake to the domain
  // actually completed (fetchHead errors out on a broken/missing cert before
  // any status is returned), so it doubles as a real SSL signal. No row yet
  // means the domain hasn't been checked by the cron since it was added.
  const domainNames = [...new Set(domainRows.map((d) => d.domain as string))]
  const { data: healthRows } = domainNames.length
    ? await supabaseAdmin
        .from('tenant_health')
        .select('domain, status, checks')
        .in('domain', domainNames)
    : { data: [] as Array<{ domain: string; status: string; checks: { reachable?: boolean } | null }> }
  const healthByDomain = new Map((healthRows || []).map((h) => [h.domain as string, h]))

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
  // website_visits.created_at is a true-UTC TIMESTAMPTZ; "today"/"this month"
  // mean the ET calendar day. Building the boundary via server-local getters
  // reads UTC on Vercel instead (see lib/recurring's etDayBoundaryUTC header).
  const today = etToday()
  const todayStart = etDayBoundaryUTC(today).getTime()
  const monthStart = etDayBoundaryUTC({ ...today, day: 1 }).getTime()
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000

  const pageViews = allVisits.filter(v => v.action === 'visit' || !v.action)
  const ctaEvents = allVisits.filter(v => v.cta_type)

  const stats = {
    totalVisits: pageViews.length,
    todayVisits: pageViews.filter(v => new Date(v.created_at).getTime() >= todayStart).length,
    monthVisits: pageViews.filter(v => new Date(v.created_at).getTime() >= monthStart).length,
    totalCtas: ctaEvents.length,
  }

  // Per-tenant website summary (visits/ctas) — global totals, split by range.
  const tenantStats: Record<string, { visits: number; ctas: number }> = {}
  const tenantVisitRanges: Record<string, { total: number; d30: number; d7: number }> = {}
  for (const v of pageViews) {
    if (!tenantStats[v.tenant_id]) tenantStats[v.tenant_id] = { visits: 0, ctas: 0 }
    tenantStats[v.tenant_id].visits++
    if (!tenantVisitRanges[v.tenant_id]) tenantVisitRanges[v.tenant_id] = { total: 0, d30: 0, d7: 0 }
    const range = tenantVisitRanges[v.tenant_id]
    range.total++
    const t = new Date(v.created_at).getTime()
    if (t >= monthStart) range.d30++
    if (t >= sevenDaysAgo) range.d7++
  }
  for (const v of ctaEvents) {
    if (!tenantStats[v.tenant_id]) tenantStats[v.tenant_id] = { visits: 0, ctas: 0 }
    tenantStats[v.tenant_id].ctas++
  }

  // Shaped for the admin Website Network page (src/app/admin/websites/page.tsx),
  // which historically requested `data.websites`/`data.tenants` — fields this
  // endpoint never returned, so the page always rendered its empty state
  // regardless of how many domains actually existed. Visit counts are
  // tenant-level (website_visits carries no domain column), so a tenant with
  // multiple domain rows shows its full tenant total on each — same
  // limitation `tenantStats` above already has, not a regression.
  const websites = domainRows.map((d) => {
    const health = healthByDomain.get(d.domain as string)
    const status: 'active' | 'pending_dns' | 'error' = !health
      ? 'pending_dns'
      : health.status === 'pass'
        ? 'active'
        : 'error'
    const range = tenantVisitRanges[d.tenant_id as string] || { total: 0, d30: 0, d7: 0 }
    return {
      id: d.id,
      tenant_id: d.tenant_id,
      tenant_name: tenantNameById.get(d.tenant_id as string) || 'Unknown',
      domain: d.domain,
      status,
      visits_total: range.total,
      visits_30d: range.d30,
      visits_7d: range.d7,
      ssl_active: !!health?.checks?.reachable,
      created_at: d.created_at,
    }
  })

  return NextResponse.json({
    domains: domainRows,
    stats,
    tenantStats,
    websites,
    tenants,
  })
}

// Mirrors src/middleware.ts BESPOKE_SITE_TENANTS VERBATIM — same copy-and-
// drift-test pattern as src/lib/activate-tenant.ts (see its declaration for
// why this isn't a shared import: each call site keeps its own guarded copy).
// Without this, a domain an admin adds manually here for a bespoke tenant
// falls to tenant_domains.routing_mode's column DEFAULT ('template') instead
// of 'bespoke' — the same "DB says template-routed while the real site is
// bespoke" mis-route class already fixed for the onboarding script
// (onboard-tenant-site.ts) and tenant activation (activate-tenant.ts); this
// endpoint was the one remaining tenant_domains write path that skipped it.
// Kept honest by route.bespoke-drift.test.ts.
const BESPOKE_SITE_TENANTS = new Set<string>([
  'nycmaid',
  'we-pay-you-junk',
  'nyc-mobile-salon',
  'the-florida-maid',
  'the-nyc-exterminator',
  'nyc-tow',
  'nycroadsideemergencyassistance',
  'theroadsidehelper',
  'toll-trucks-near-me',
  'sunnyside-clean-nyc',
  'wash-and-fold-nyc',
  'wash-and-fold-hoboken',
  'landscaping-in-nyc',
  'debt-service-ratio-loan',
  'fla-dumpster-rentals',
  'stretch-ny',
  'stretch-service',
  'the-home-services-company',
  'the-nyc-interior-designer',
  'the-nyc-marketing-company',
  'the-nyc-seo',
  'consortium-nyc',
])

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenant_id, domain: rawDomain, is_primary } = await request.json()

  if (!tenant_id || !rawDomain) {
    return NextResponse.json({ error: 'tenant_id and domain are required' }, { status: 400 })
  }

  // Every other tenant_domains write path (activate-tenant.ts's carryHost/
  // customHost) normalizes a domain before storing it: lowercased, protocol/
  // path/www stripped. This route inserted whatever the admin typed verbatim.
  // getTenantByDomain() does an exact `.eq('domain', ...)` match against a
  // lowercased, www-stripped incoming hostname, so an admin-entered
  // "Example.com", "https://example.com/", or "www.example.com" silently
  // created a row real traffic could never match — it "added" successfully
  // (201) but was dead on arrival for routing.
  const domain = normalizeDomain(String(rawDomain))
  if (!domain) {
    return NextResponse.json({ error: 'domain is invalid after normalization' }, { status: 400 })
  }

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('slug')
    .eq('id', tenant_id)
    .single()

  const routingMode = tenantRow?.slug && BESPOKE_SITE_TENANTS.has(tenantRow.slug as string)
    ? 'bespoke'
    : 'template'

  // Every read site (site-export's "resolve the primary domain", 068's
  // is_primary->type backfill mapping, the admin UI itself) assumes at most
  // ONE is_primary=true row per tenant, but nothing enforced it — this insert
  // just added a caller-supplied is_primary with no check for an existing
  // primary. Two admin adds (or one repeated call) left a tenant with 2+
  // "primary" domains, which every consumer resolves by picking an arbitrary
  // one (first match / .find()) rather than erroring, so the bug was silent
  // data corruption, not a crash. Clear any existing primary for this tenant
  // BEFORE inserting the new one, same invariant
  // 2026_07_16_set_primary_client_contact.sql enforces for client_contacts.
  if (is_primary) {
    await supabaseAdmin
      .from('tenant_domains')
      .update({ is_primary: false })
      .eq('tenant_id', tenant_id)
      .eq('is_primary', true)
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .insert({
      tenant_id,
      domain,
      is_primary: is_primary || false,
      type: is_primary ? 'primary' : 'generic',
      routing_mode: routingMode,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // activate-tenant.ts's domain_routing step is the ONLY other tenant_domains
  // write path, and it always pairs the DB row with a live Vercel project-domain
  // registration (registerCarryingDomain / registerCustomDomain) — without that,
  // Vercel never routes or issues a cert for the host. This endpoint inserted
  // the DB row and stopped: a 201 here read as "domain added" in the admin UI,
  // but the domain was never attached to the Vercel project, so it would 404/
  // cert-error on every real request regardless of how correctly it resolves in
  // tenant_domains. Register it the same way activation does — never throws, so
  // a Vercel-side failure surfaces in the response instead of blocking the row
  // that's already been created.
  const vercel = await registerCustomDomain(domain)

  return NextResponse.json({ domain: data, vercel }, { status: 201 })
}

// This route's POST is the only tenant_domains write path an admin can trigger
// outside full tenant deletion (activate-tenant.ts's domain_routing step is
// activation-only), but until now nothing could remove a row it added — no
// DELETE handler here, no UI action on the admin page. A mistyped domain, a
// stale alias, or a tenant that switched off a custom domain had no fix short
// of manual DB surgery or deleting the entire tenant (which destroys every
// other table's data via cascade, not just the domain). Mirrors
// admin/businesses/[id]'s DELETE: capture the domain before removing the row,
// detach apex + www from Vercel best-effort after (registerCustomDomain adds
// both on POST; removeDomain never throws, matching that route's contract), so
// a removed domain also stops being routable/certified instead of staying
// silently attached to the Vercel project after its DB row is gone.
export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data: row } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain')
    .eq('id', id)
    .single()

  if (!row) {
    return NextResponse.json({ error: 'domain not found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin
    .from('tenant_domains')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const domain = row.domain as string
  const apex = domain.replace(/^www\./, '')
  const [apexResult, wwwResult] = await Promise.all([
    removeDomain(apex),
    removeDomain(`www.${apex}`),
  ])

  return NextResponse.json({ success: true, vercel: [apexResult, wwwResult] })
}
