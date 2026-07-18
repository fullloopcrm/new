import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { findDomainOwner } from '@/lib/domains'

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

  // Reject a domain already claimed by ANOTHER tenant via the LEGACY
  // tenants.domain column BEFORE inserting into tenant_domains. tenant_domains
  // itself is protected by its own DB UNIQUE(domain) constraint (the 23505
  // handler below), but that constraint only guards tenant_domains against
  // ITSELF — it has no relationship to tenants.domain, which carries no
  // constraint at all. Without this check, an admin could insert a
  // tenant_domains row for a domain some OTHER, not-yet-migrated tenant
  // already serves via tenants.domain: the insert succeeds with a clean 201
  // (no unique-constraint hit, since tenant_domains has no existing row for
  // that domain), and the resolver's TRANSITION ASSERT-AND-REFUSE divergence
  // guard (getTenantByDomain in tenant-lookup.ts/tenant.ts) then throws
  // TENANT_DIVERGENCE on the VERY NEXT real request to that host — darkening
  // the other, already-live tenant's site, discovered as a production outage
  // instead of a validation error at the point of the actual mistake. Mirrors
  // the same findDomainOwner guard already wired into the three tenants.domain
  // write sites (admin/businesses POST, admin/businesses/[id] PUT,
  // admin/tenants/[id] PUT) — this is the missing fourth: the tenant_domains
  // write site checking the OTHER direction. excludeTenantId=tenant_id so a
  // tenant registering its own already-owned legacy domain into tenant_domains
  // (the intended migration path) is never flagged as a false-positive
  // collision against itself.
  const owner = await findDomainOwner(cleanDomain, tenant_id)
  if (owner && owner.source === 'tenants.domain') {
    return NextResponse.json(
      { error: `${cleanDomain} is already registered to ${owner.tenantName}. Remove it there first, or reassign it, before adding it here.` },
      { status: 409 },
    )
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

// Reassign an existing tenant_domains row to a different tenant.
//
// Before this, the ONLY way to move a domain between tenants was DELETE (on
// the owning tenant's own admin row) + POST (re-add under the new tenant) —
// which this route didn't even support (no DELETE handler existed here) and
// which for a LEGACY tenants.domain collision meant navigating to the OTHER
// tenant's admin/businesses page and manually clearing its domain field,
// with no cross-link from the collision error message that names them. The
// POST 409/23505 error text has always promised "remove it there first, or
// reassign it" — this is the missing "reassign it" half. A direct PATCH also
// avoids the DELETE+POST round trip re-triggering a full Vercel domain
// detach/reattach cycle (registerCustomDomain's cert issuance, DNS
// propagation wait) for a domain that's already correctly attached at the
// Vercel layer — only tenant OWNERSHIP is changing, not routing.
export async function PATCH(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id, tenant_id } = await request.json()

  if (!id || !tenant_id) {
    return NextResponse.json({ error: 'id and tenant_id are required' }, { status: 400 })
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('tenant_domains')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }
  if (!existing) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }
  if (existing.tenant_id === tenant_id) {
    return NextResponse.json({ error: 'Domain is already assigned to this tenant' }, { status: 400 })
  }

  const { data: destTenant, error: destTenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('id', tenant_id)
    .maybeSingle()

  if (destTenantError) {
    return NextResponse.json({ error: destTenantError.message }, { status: 500 })
  }
  if (!destTenant) {
    return NextResponse.json({ error: 'Destination tenant not found' }, { status: 404 })
  }

  // Legacy-collision guard, narrowed to ONLY the tenants.domain source. The
  // full findDomainOwner() (used by POST) also checks tenant_domains itself,
  // which would false-positive here: this exact domain already has an active
  // tenant_domains row (the one we're reassigning), so a tenant_domains-vs-
  // itself check excluding only the DESTINATION tenant would always find the
  // row under its CURRENT (pre-move) tenant_id and report it as "owned by
  // another tenant" on every single reassignment. What actually needs
  // checking is whether some THIRD, not-yet-migrated tenant already serves
  // this exact host via the legacy tenants.domain column — moving the row to
  // destTenant doesn't fix that collision, it just relocates which tenant the
  // resolver's TRANSITION divergence guard fires against.
  const { data: legacyOwner, error: legacyError } = await supabaseAdmin
    .from('tenants')
    .select('id, name')
    .eq('domain', existing.domain)
    .neq('id', tenant_id)
    .maybeSingle()

  if (legacyError) {
    return NextResponse.json({ error: legacyError.message }, { status: 500 })
  }
  if (legacyOwner) {
    return NextResponse.json(
      {
        error: `${existing.domain} is already registered to ${legacyOwner.name || 'another tenant'} via its legacy domain field. Clear it there first, then retry the reassignment.`,
      },
      { status: 409 },
    )
  }

  const previousTenantId = existing.tenant_id

  // Force is_primary false on the destination side rather than carrying the
  // source tenant's flag over — destTenant may already have its own primary
  // domain, and blindly setting a second is_primary=true row would recreate
  // the exact non-deterministic-primary bug the demote-before-set logic in
  // POST exists to prevent. The admin can re-flag it primary as a separate,
  // explicit action once it's confirmed live under the new tenant.
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .update({ tenant_id, is_primary: false })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bust the edge cache on all three fronts that just went stale: the domain
  // itself now resolves to a different tenant (invalidateDomainCache), and
  // both the old and new tenant's own cached lookups (slug/id-keyed) can
  // carry stale domain-set assumptions (invalidateTenantCache).
  const { invalidateDomainCache, invalidateTenantCache } = await import('@/lib/tenant-lookup')
  invalidateDomainCache(existing.domain)
  invalidateTenantCache(previousTenantId)
  invalidateTenantCache(tenant_id)

  return NextResponse.json({ domain: data })
}
