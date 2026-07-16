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
    throw new Error(`TENANT_DOMAINS_LOOKUP_ERROR: ${error.message}`)
  }

  return (data || []) as TenantDomain[]
}

// Get all domains as a Set for fast lookup (includes www variants)
export async function getOwnedDomainSet(tenantId: string): Promise<Set<string>> {
  const domains = await getTenantDomains(tenantId)
  return new Set(
    domains.flatMap(d => [d.domain, `www.${d.domain}`])
  )
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
    throw new Error(`TENANT_DOMAINS_NEIGHBORHOOD_LOOKUP_ERROR: ${error.message}`)
  }

  return (data || []).map(d => d.domain)
}

// Get neighborhood from zip code (per tenant)
export async function getNeighborhoodFromZip(tenantId: string, zip: string): Promise<string | null> {
  // Deliberately not .single(): a genuine "no zip match" is 0 rows, which
  // .single() reports as the SAME error shape as a real DB failure (both
  // land in `error`), making the two indistinguishable. .limit(1) + take
  // the first element keeps "not found" as a plain empty array while a
  // real error still surfaces below instead of being read as "not found".
  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .select('neighborhood')
    .eq('tenant_id', tenantId)
    .contains('zip_codes', [zip])
    .limit(1)

  if (error) {
    throw new Error(`TENANT_DOMAINS_ZIP_LOOKUP_ERROR: ${error.message}`)
  }

  return data?.[0]?.neighborhood || null
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
