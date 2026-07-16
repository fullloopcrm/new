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
  // Slugs are always generated lowercase (slugify()/toSlug() in every tenant-
  // creation path) — the DB never holds a mixed-case slug. Lowercasing here
  // means a caller-supplied slug (partner ingest APIs pass tenant_slug
  // straight from request bodies with no normalization) still resolves on
  // case mismatch instead of silently 400ing "Unknown tenant" for a real one.
  const cleanSlug = slug.toLowerCase()

  const cached = getCached(slugCache, cleanSlug)
  if (cached !== undefined) return cached

  const sb = getSupabase()
  const { data, error } = await sb
    .from('tenants')
    .select('id, slug, name, domain, status')
    .eq('slug', cleanSlug)
    .single()

  if (error || !data) {
    setCache(slugCache, cleanSlug, null)
    return null
  }

  const tenant: TenantInfo = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    domain: data.domain,
    status: data.status,
  }

  setCache(slugCache, cleanSlug, tenant)
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
 *
 * TRANSITION ASSERT-AND-REFUSE guard: while both sources are live, a
 * tenant_domains match to tenant A is cross-checked against the legacy
 * tenants.domain row for the same host. If legacy maps the host to a DIFFERENT
 * tenant B, we do NOT silently pick A — we log a loud, greppable
 * `TENANT_DIVERGENCE host=<h> td=<A> legacy=<B>` line and throw, so nothing is
 * served rather than serving one tenant's data under the other's brand. We
 * proceed with the tenant_domains-first result ONLY when legacy agrees (same
 * tenant_id) or legacy has no row for the host. Remove this guard once
 * tenants.domain is retired.
 */
export async function getTenantByDomain(domain: string): Promise<TenantInfo | null> {
  // Lowercase THEN strip www. — order matters: the www. regex is
  // case-sensitive, so a mixed-case host like "WWW.Acme.com" would otherwise
  // skip the strip and never match a lowercase DB row. Callers (middleware,
  // the resend webhook) already normalize their inputs, but this resolver's
  // contract (see the doc comment above) is host -> tenant, and hosts are
  // case-insensitive by spec — the guarantee shouldn't depend on every
  // present and future caller remembering to lowercase first.
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '')

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
      // TRANSITION ASSERT-AND-REFUSE: cross-check the legacy tenants.domain row
      // for this host. If it maps the SAME host to a DIFFERENT tenant, refuse
      // rather than silently pick — this is the brand-swap failure mode.
      //
      // maybeSingle() (not single()): tenants.domain carries NO unique
      // constraint at the DB level (unlike tenant_domains.domain, which does —
      // see supabase/schema.sql vs migrations/043_tenant_domains.sql), so two
      // legacy rows can genuinely share a host. single() would surface that as
      // an error with data:null — indistinguishable from "no legacy row" once
      // destructured — silently disabling this exact guard on the one input
      // (an ambiguous legacy table) it exists to catch. maybeSingle() still
      // errors on 2+ rows, but we check for it explicitly below instead of
      // discarding it, so an ambiguous legacy match refuses loudly instead of
      // being treated as "legacy agrees."
      const { data: legacy, error: legacyError } = await sb
        .from('tenants')
        .select('id')
        .eq('domain', cleanDomain)
        .maybeSingle()

      if (legacyError) {
        console.error(
          `TENANT_DIVERGENCE_AMBIGUOUS host=${cleanDomain} td=${t.id} legacy_error=${legacyError.message}`,
        )
        throw new Error(
          `TENANT_DIVERGENCE_AMBIGUOUS host=${cleanDomain} td=${t.id} legacy_error=${legacyError.message}`,
        )
      }

      if (legacy && legacy.id !== t.id) {
        // Loud + greppable. Do NOT cache; do NOT return a tenant.
        console.error(`TENANT_DIVERGENCE host=${cleanDomain} td=${t.id} legacy=${legacy.id}`)
        throw new Error(
          `TENANT_DIVERGENCE host=${cleanDomain} td=${t.id} legacy=${legacy.id}`,
        )
      }

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
