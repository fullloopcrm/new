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
 *
 * Lowercases the input before caching/querying: every real slug is stored
 * lowercase (BESPOKE_SITE_TENANTS, tenants.slug), but callers don't all
 * normalize case themselves — middleware's extractSubdomain now lowercases
 * the Host header before extracting a slug, but /api/ingest/lead and
 * /api/ingest/application pass an external partner's raw `tenant_slug` body
 * field straight through with only `.trim()`, no case normalization. A
 * case-sensitive `.eq('slug', slug)` against a mixed-case value (e.g.
 * "NycMaid") silently misses the real, lowercase-stored row — the exact
 * shape of miss this file's own cache would otherwise mask forever, since a
 * miss is negatively cached too. Normalizing HERE, once, fixes every current
 * and future caller instead of requiring each call site to remember to do it.
 */
export async function getTenantBySlug(slug: string): Promise<TenantInfo | null> {
  const key = slug.toLowerCase()
  const cached = getCached(slugCache, key)
  if (cached !== undefined) return cached

  const sb = getSupabase()
  const { data, error } = await sb
    .from('tenants')
    .select('id, slug, name, domain, status')
    .eq('slug', key)
    .single()

  if (error || !data) {
    setCache(slugCache, key, null)
    return null
  }

  const tenant: TenantInfo = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    domain: data.domain,
    status: data.status,
  }

  setCache(slugCache, key, tenant)
  return tenant
}

/**
 * Look up a tenant by custom domain (cached, 5-min TTL)
 * Checks both tenants.domain and tenant_domains.domain
 *
 * Lowercases BEFORE stripping the www. prefix — the strip regex (`^www\.`)
 * is itself case-sensitive, so an un-lowercased "WWW.acme.com" would skip
 * the strip entirely and query/cache under the wrong key ("www.acme.com"
 * instead of "acme.com"), same root cause and same fix as getTenantBySlug
 * above. Every current caller already passes a lowercased value (middleware's
 * cleanHost, inbound-email-tenant's emailDomain), so this is defense-in-depth
 * for this function's own contract rather than a fix for a live caller bug —
 * but the fix belongs on the primitive so a future caller can't reintroduce
 * the class of bug getTenantBySlug just had.
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Strip www. prefix for lookup
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '')

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
