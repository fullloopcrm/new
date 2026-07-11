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
  // P1 routing metadata sourced from the matched tenant_domains row. Present
  // only on the primary (tenant_domains-first) resolution path AND once the W1
  // migration that adds these columns has landed — undefined on the
  // tenants.domain fallback path and pre-migration. Treated as plain text with
  // the CHECK-constrained domains from P1-SCHEMA-SPEC.md.
  routingMode?: string
  vercelProject?: string
  domainStatus?: string
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
 * Look up a tenant by custom domain (cached, 5-min TTL).
 *
 * P1 resolution order (see P1-SCHEMA-SPEC.md):
 *   1. tenant_domains FIRST — match the request host to a tenant_id. This is
 *      the source of truth for host routing going forward and also carries the
 *      routing_mode / vercel_project / status metadata added by W1's migration.
 *   2. tenants.domain FALLBACK — used only when no active tenant_domains row
 *      exists for the host. Kept (NOT dropped) for tenants not yet migrated.
 *
 * Cross-tenant safety: when a tenant_domains row matches, its tenant_id is
 * authoritative. If that tenant_id fails to resolve (dangling pointer), we
 * return null rather than falling through to tenants.domain — falling through
 * could resolve the host to a DIFFERENT tenant (the brand-swap failure mode).
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Strip www. prefix for lookup
  const cleanDomain = domain.replace(/^www\./, '')

  const cached = getCached(domainCache, cleanDomain)
  if (cached !== undefined) return cached

  const sb = getSupabase()

  // 1. tenant_domains FIRST (host -> tenant_id). select('*') is migration-safe:
  // it returns the new P1 columns once they exist and just omits them before
  // the migration lands, so this query never breaks against the un-migrated DB.
  const { data: domainRow } = await sb
    .from('tenant_domains')
    .select('*')
    .eq('domain', cleanDomain)
    .eq('active', true)
    .single()

  if (domainRow?.tenant_id) {
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
        routingMode: domainRow.routing_mode ?? undefined,
        vercelProject: domainRow.vercel_project ?? undefined,
        domainStatus: domainRow.status ?? undefined,
      }
      setCache(domainCache, cleanDomain, tenant)
      return tenant
    }

    // Dangling tenant_domains pointer: the host is claimed by tenant_id but that
    // tenant no longer resolves. Do NOT fall through to tenants.domain — that
    // could serve the host as a different tenant. Nothing is served.
    setCache(domainCache, cleanDomain, null)
    return null
  }

  // 2. Fallback: tenants.domain (legacy source of truth, retained per P1 spec).
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

  setCache(domainCache, cleanDomain, null)
  return null
}
