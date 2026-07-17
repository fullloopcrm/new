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
  const { data } = await supabaseAdmin
    .from('tenant_domains')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('type', { ascending: true })

  return (data || []) as TenantDomain[]
}

// Get all domains as a Set for fast lookup (includes www variants)
export async function getOwnedDomainSet(tenantId: string): Promise<Set<string>> {
  const domains = await getTenantDomains(tenantId)
  return new Set(
    domains.flatMap(d => [d.domain, `www.${d.domain}`])
  )
}

// Resolve a tenant's primary active domain from tenant_domains (tenant_id ->
// domain, the reverse of tenant-lookup.ts's getTenantByDomain). Prefers the
// row flagged is_primary; falls back to the first active row when none is
// flagged (mirrors referrers/[code]/route.ts's and site-export's inline
// precedent). Returns null when the tenant has no tenant_domains rows at all
// — callers combine this with the tenants.domain fallback, same precedence
// as the request-time resolver.
export async function getPrimaryTenantDomain(tenantId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain, is_primary')
    .eq('tenant_id', tenantId)
    .eq('active', true)

  if (error) {
    console.error(`PRIMARY_TENANT_DOMAIN_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
    throw new Error(`PRIMARY_TENANT_DOMAIN_LOOKUP_ERROR tenant_id=${tenantId} error=${error.message}`)
  }

  const rows = (data || []) as Array<{ domain: string; is_primary: boolean }>
  return rows.find(d => d.is_primary)?.domain || rows[0]?.domain || null
}

// Get domains for a specific neighborhood
export async function getDomainsForNeighborhood(tenantId: string, neighborhood: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain')
    .eq('tenant_id', tenantId)
    .eq('neighborhood', neighborhood)
    .eq('active', true)

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
