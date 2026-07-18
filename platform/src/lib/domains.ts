import { supabaseAdmin } from './supabase'

export interface TenantDomain {
  id: string
  tenant_id: string
  domain: string
  type: 'primary' | 'neighborhood' | 'generic'
  neighborhood?: string | null
  zip_codes?: string[] | null
  active: boolean
}

// Get all domains for a tenant
export async function getTenantDomains(tenantId: string): Promise<TenantDomain[]> {
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('type', { ascending: true })

  if (error) {
    console.error(`TENANT_DOMAINS_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
    throw new Error(`TENANT_DOMAINS_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
  }

  return (data || []) as TenantDomain[]
}

// Get all domains as a Set for fast lookup (includes www variants).
//
// Unions tenant_domains rows WITH the legacy tenants.domain/domain_name
// columns — this is deliberately NOT a first-wins fallback like
// getPrimaryTenantDomain()/getTenantByDomain(). Those resolve "which ONE host
// serves this tenant right now"; this answers "which hosts count as THIS
// tenant's own site" for referrer-attribution callers (isOwnedReferrer). A
// tenant already migrated to tenant_domains can still have a live (or
// recently live) legacy tenants.domain — dropping it from the set would
// misclassify that tenant's own self-referral traffic as an external
// referrer. Previously read tenant_domains only, so a tenant whose site
// still lived solely at tenants.domain (not yet migrated) got an EMPTY owned
// set — every visit from their own domain looked like an external referrer.
export async function getOwnedDomainSet(tenantId: string): Promise<Set<string>> {
  const domains = await getTenantDomains(tenantId)
  const owned = new Set(domains.flatMap(d => [d.domain, `www.${d.domain}`]))

  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('domain, domain_name')
    .eq('id', tenantId)
    .maybeSingle()

  if (error) {
    console.error(`OWNED_DOMAIN_SET_TENANT_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
    throw new Error(`OWNED_DOMAIN_SET_TENANT_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
  }

  for (const raw of [tenant?.domain, tenant?.domain_name]) {
    if (!raw) continue
    const clean = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
    if (!clean) continue
    owned.add(clean)
    owned.add(`www.${clean}`)
  }

  return owned
}

// Resolve a tenant's primary active domain from tenant_domains (tenant_id ->
// domain, the reverse of tenant-lookup.ts's getTenantByDomain). Prefers the
// row flagged is_primary; falls back to the first active row when none is
// flagged (mirrors referrers/[code]/route.ts's and site-export's inline
// precedent). Returns null when the tenant has no tenant_domains rows at all
// — callers combine this with the tenants.domain fallback, same precedence
// as the request-time resolver.
//
// Ordered by created_at ascending — nothing else here disambiguates when
// MORE THAN ONE row is flagged is_primary for the same tenant. Postgres gives
// no ordering guarantee on an unordered select, so `.find()` on an unordered
// result would pick a different "primary" from request to request. The write
// path (admin/websites POST) now demotes any existing primary before setting
// a new one, so this shouldn't recur going forward — this ordering is
// defense-in-depth for any row that predates that fix (or slips past it),
// making the OLDEST is_primary row consistently win instead of an arbitrary
// one.
export async function getPrimaryTenantDomain(tenantId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain, is_primary, created_at')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(`PRIMARY_TENANT_DOMAIN_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
    throw new Error(`PRIMARY_TENANT_DOMAIN_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
  }

  const rows = (data || []) as Array<{ domain: string; is_primary: boolean; created_at: string }>
  return rows.find(d => d.is_primary)?.domain || rows[0]?.domain || null
}

// Write-side half of the single-primary invariant: demote every OTHER active
// is_primary row for a tenant and ensure `intendedPrimaryDomain` is flagged
// primary. Same demote-then-set pattern already inlined in admin/websites
// POST for its own insert — exported here so a SECOND, independent
// tenant_domains write site (activate-tenant.ts's upsert) can share it
// instead of silently missing the invariant.
//
// activate-tenant.ts's own writer needs this because its upsert uses
// `ignoreDuplicates: true` and is explicitly documented as "safe to hit
// repeatedly" — re-running activation after the tenant's custom domain
// changes (typo fix, or simply adding a real custom domain after their first
// activation ran on the free subdomain) inserts a NEW row flagged primary
// but can never flip is_primary on a domain row that already existed from a
// prior run, since ignoreDuplicates skips touching existing rows entirely.
// Without this reconcile step, both the old and new domain stay flagged
// primary and getPrimaryTenantDomain()'s oldest-wins tiebreak keeps
// resolving to the STALE domain forever — silently undoing the point of the
// new one across tenantSiteUrl(), invoice/quote/document send links, SMS
// branding, and the SELENA agent's brand override.
export async function reconcilePrimaryDomain(tenantId: string, intendedPrimaryDomain: string): Promise<void> {
  const { error: demoteError } = await supabaseAdmin
    .from('tenant_domains')
    .update({ is_primary: false })
    .eq('tenant_id', tenantId)
    .eq('is_primary', true)
    .neq('domain', intendedPrimaryDomain)

  if (demoteError) {
    console.error(
      `PRIMARY_DOMAIN_RECONCILE_DEMOTE_ERROR tenant_id=${tenantId} domain=${intendedPrimaryDomain} error=${demoteError.message}`,
    )
    throw new Error(
      `PRIMARY_DOMAIN_RECONCILE_DEMOTE_ERROR tenant_id=${tenantId} domain=${intendedPrimaryDomain} error=${demoteError.message}`,
    )
  }

  const { error: setError } = await supabaseAdmin
    .from('tenant_domains')
    .update({ is_primary: true })
    .eq('tenant_id', tenantId)
    .eq('domain', intendedPrimaryDomain)

  if (setError) {
    console.error(
      `PRIMARY_DOMAIN_RECONCILE_SET_ERROR tenant_id=${tenantId} domain=${intendedPrimaryDomain} error=${setError.message}`,
    )
    throw new Error(
      `PRIMARY_DOMAIN_RECONCILE_SET_ERROR tenant_id=${tenantId} domain=${intendedPrimaryDomain} error=${setError.message}`,
    )
  }
}

export interface DomainOwner {
  tenantId: string
  tenantName: string
  /** Which table the collision was found in — shapes the error message a caller shows. */
  source: 'tenant_domains' | 'tenants.domain'
}

// Check whether `domain` (already normalized: lowercase, no protocol/path/www)
// is claimed by a DIFFERENT tenant, via EITHER active tenant_domains OR the
// legacy tenants.domain column — the same two sources the resolver treats as
// authoritative (getTenantByDomain in tenant.ts/tenant-lookup.ts).
//
// tenant_domains.domain is UNIQUE at the DB level, so its own write site
// (admin/websites POST) naturally gets a 23505 on a collision and handles it
// gracefully. tenants.domain carries NO unique constraint — nothing at the DB
// level stops two tenants from sharing it — yet every write site to
// tenants.domain (tenant creation, admin/businesses/[id] PUT, admin/tenants/[id]
// PUT) wrote it directly with no collision check at all. The moment two
// tenants' domain columns collide (or a new/edited tenant's domain collides
// with an EXISTING tenant's tenant_domains row), the resolver's own TRANSITION
// ASSERT-AND-REFUSE divergence guard throws TENANT_DIVERGENCE /
// TENANT_DIVERGENCE_AMBIGUOUS on EVERY request to that host — darkening the
// EXISTING tenant's live site, not just rejecting the new write. Callers
// should check this BEFORE writing `domain` and reject with a clear error
// instead of letting the collision reach production.
export async function findDomainOwner(domain: string, excludeTenantId?: string): Promise<DomainOwner | null> {
  let tdQuery = supabaseAdmin
    .from('tenant_domains')
    .select('tenant_id')
    .eq('domain', domain)
    .eq('active', true)
  if (excludeTenantId) tdQuery = tdQuery.neq('tenant_id', excludeTenantId)
  const { data: tdRow, error: tdError } = await tdQuery.maybeSingle()

  if (tdError) {
    console.error(`DOMAIN_OWNER_LOOKUP_ERROR domain=${domain} error=${tdError.message}`)
    throw new Error(`DOMAIN_OWNER_LOOKUP_ERROR domain=${domain} error=${tdError.message}`)
  }

  if (tdRow?.tenant_id) {
    const { data: owner } = await supabaseAdmin.from('tenants').select('name').eq('id', tdRow.tenant_id).maybeSingle()
    return { tenantId: tdRow.tenant_id, tenantName: owner?.name || 'another tenant', source: 'tenant_domains' }
  }

  let legacyQuery = supabaseAdmin.from('tenants').select('id, name').eq('domain', domain)
  if (excludeTenantId) legacyQuery = legacyQuery.neq('id', excludeTenantId)
  const { data: legacyRow, error: legacyError } = await legacyQuery.maybeSingle()

  if (legacyError) {
    console.error(`DOMAIN_OWNER_LOOKUP_ERROR domain=${domain} error=${legacyError.message}`)
    throw new Error(`DOMAIN_OWNER_LOOKUP_ERROR domain=${domain} error=${legacyError.message}`)
  }

  if (legacyRow) {
    return { tenantId: legacyRow.id, tenantName: legacyRow.name || 'another tenant', source: 'tenants.domain' }
  }

  return null
}

// Get domains for a specific neighborhood
export async function getDomainsForNeighborhood(tenantId: string, neighborhood: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain')
    .eq('tenant_id', tenantId)
    .eq('neighborhood', neighborhood)
    .eq('active', true)

  if (error) {
    console.error(`DOMAINS_FOR_NEIGHBORHOOD_LOOKUP_ERROR tenant_id=${tenantId} neighborhood=${neighborhood} error=${error.message}`)
    throw new Error(`DOMAINS_FOR_NEIGHBORHOOD_LOOKUP_ERROR tenant_id=${tenantId} neighborhood=${neighborhood} error=${error.message}`)
  }

  return (data || []).map(d => d.domain)
}

// Get neighborhood from zip code (per tenant)
export async function getNeighborhoodFromZip(tenantId: string, zip: string): Promise<string | null> {
  // maybeSingle() (not single()) — most zips legitimately match zero
  // tenant_domains rows (no neighborhood mapped), which single() treats as
  // the same error as a genuine DB failure. Discarding that error made both
  // cases collapse to "no neighborhood" silently instead of surfacing a real
  // outage loud.
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('neighborhood')
    .eq('tenant_id', tenantId)
    .contains('zip_codes', [zip])
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`TENANT_DOMAIN_ZIP_LOOKUP_ERROR tenant_id=${tenantId} zip=${zip} error=${error.message}`)
    throw new Error(`TENANT_DOMAIN_ZIP_LOOKUP_ERROR tenant_id=${tenantId} zip=${zip} error=${error.message}`)
  }
  return data?.neighborhood || null
}

// Extract zip code from address string
export function extractZip(address: string): string | null {
  // Match 5-digit zip at end of string
  const match = address.match(/\b(\d{5})(?:-\d{4})?\s*$/)
  if (match) return match[1]

  // Match 5-digit zip anywhere
  const anyMatch = address.match(/\b(\d{5})\b/)
  return anyMatch ? anyMatch[1] : null
}
