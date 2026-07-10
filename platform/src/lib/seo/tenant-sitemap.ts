/**
 * Shared multi-tenant sitemap engine.
 *
 * The platform backend is multi-tenant, but the marketing sites under
 * app/site/<slug>/ were forked per tenant — each with its own copied SEO data,
 * its own route tree, and (previously) its own bespoke sitemap. That meant an
 * SEO fix had to be repeated N times and drifted. This engine centralizes the
 * LOGIC: each tenant registers a small descriptor (its base URL + a function
 * that enumerates its code-defined content URLs from its own data). One engine,
 * per-tenant config — the true-tenant pattern.
 *
 * Consumed two ways:
 *  - A tenant's app/site/<slug>/sitemap.ts can `export default () =>
 *    buildTenantSitemap(TENANT_SEO[slug])` (Next-native rich sitemap path).
 *  - The generic /api/tenant-sitemap route uses TENANT_SEO[slug] when present,
 *    falling back to the DB-driven generic sitemap for unregistered tenants.
 *
 * URLs use each tenant's canonical host (www where the pages canonicalize to www).
 */
import type { MetadataRoute } from 'next'

export type ChangeFreq = MetadataRoute.Sitemap[number]['changeFrequency']

export interface UrlSpec {
  loc: string
  priority: number
  changeFrequency: ChangeFreq
}

export interface TenantSeoDescriptor {
  slug: string
  baseUrl: string
  /** Enumerate every code-defined content URL for this tenant. */
  buildUrls: () => UrlSpec[]
}

/**
 * Per-tenant registry. Add an entry to onboard a tenant onto the shared engine.
 * Each entry pulls from that tenant's OWN data modules — heterogeneous data
 * shapes and route trees are fine; the descriptor adapts them to UrlSpec[].
 */
export const TENANT_SEO: Record<string, TenantSeoDescriptor> = {}

/** Helper to register a descriptor (keeps call sites tidy + typo-safe on slug). */
export function registerTenantSeo(d: TenantSeoDescriptor): void {
  TENANT_SEO[d.slug] = d
}

/** Build a Next MetadataRoute.Sitemap from a descriptor (for app/site sitemap.ts). */
export function buildTenantSitemap(d: TenantSeoDescriptor | undefined): MetadataRoute.Sitemap {
  // Undefined-safe: a restored tenant site whose descriptor is not (yet)
  // registered in TENANT_SEO must not crash the build (prerender error) — it
  // just yields an empty sitemap until its descriptor is restored. This is the
  // exact break that took the whole build down when tenants were restored after
  // the 2026-07-08 template cutover emptied the SEO registry.
  if (!d || typeof d.buildUrls !== 'function') return []
  const lastModified = new Date()
  return d.buildUrls().map((u) => ({
    url: u.loc,
    lastModified,
    changeFrequency: u.changeFrequency,
    priority: u.priority,
  }))
}

// NOTE: this engine imports NO tenant files (keeps it dependency-free / no
// import cycle). Tenant descriptors live in ./tenants/* and are loaded by the
// barrel ./tenant-seo.ts, which consumers import to guarantee registration ran.
