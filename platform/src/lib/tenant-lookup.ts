import { createClient } from '@supabase/supabase-js'

// Lightweight Supabase client for middleware (edge-compatible)
// We can't import from ./supabase because middleware runs in Edge Runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

type TenantInfo = {
  id: string
  slug: string
  name: string
  domain: string | null
  status: string
}

// In-memory cache with 5-minute TTL
const CACHE_TTL = 5 * 60 * 1000

type CacheEntry = {
  tenant: TenantInfo | null
  expiresAt: number
}

const slugCache = new Map<string, CacheEntry>()
const domainCache = new Map<string, CacheEntry>()

function getCached(cache: Map<string, CacheEntry>, key: string): TenantInfo | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined // cache miss
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined // expired
  }
  return entry.tenant // could be null (negative cache)
}

function setCache(cache: Map<string, CacheEntry>, key: string, tenant: TenantInfo | null) {
  // Cap cache size to prevent memory leaks
  if (cache.size > 1000) {
    // Evict oldest entries
    const keys = Array.from(cache.keys())
    for (let i = 0; i < 100; i++) {
      cache.delete(keys[i])
    }
  }
  cache.set(key, { tenant, expiresAt: Date.now() + CACHE_TTL })
}

/**
 * Look up a tenant by subdomain slug (cached, 5-min TTL)
 */
export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const cached = getCached(slugCache, slug)
  if (cached !== undefined) return cached

  const sb = getSupabase()
  const { data, error } = await sb
    .from('tenants')
    .select('id, slug, name, domain, status')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    setCache(slugCache, slug, null)
    return null
  }

  const tenant: TenantInfo = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    domain: data.domain,
    status: data.status,
  }

  setCache(slugCache, slug, tenant)
  return tenant
}

/**
 * Look up a tenant by custom domain (cached, 5-min TTL)
 * Checks both tenants.domain and tenant_domains.domain
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Strip www. prefix for lookup
  const cleanDomain = domain.replace(/^www\./, '')

  const cached = getCached(domainCache, cleanDomain)
  if (cached !== undefined) return cached

  const sb = getSupabase()

  // First check the tenants table domain field
  const { data: tenantData } = await sb
    .from('tenants')
    .select('id, slug, name, domain, status')
    .eq('domain', cleanDomain)
    .single()

  if (tenantData) {
    const tenant: TenantInfo = {
      id: tenantData.id,
      slug: tenantData.slug,
      name: tenantData.name,
      domain: tenantData.domain,
      status: tenantData.status,
    }
    setCache(domainCache, cleanDomain, tenant)
    return tenant
  }

  // Fall back to tenant_domains table
  const { data: domainRow } = await sb
    .from('tenant_domains')
    .select('tenant_id')
    .eq('domain', cleanDomain)
    .eq('active', true)
    .single()

  if (domainRow) {
    const { data: t } = await sb
      .from('tenants')
      .select('id, slug, name, domain, status')
      .eq('id', domainRow.tenant_id)
      .single()

    if (t) {
      const tenant: TenantInfo = {
        id: t.id,
        slug: t.slug,
        name: t.name,
        domain: t.domain,
        status: t.status,
      }
      setCache(domainCache, cleanDomain, tenant)
      return tenant
    }
  }

  setCache(domainCache, cleanDomain, null)
  return null
}
