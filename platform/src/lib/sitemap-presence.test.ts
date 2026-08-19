import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Sitemap-presence regression guard for tenant marketing sites (W3 deploy-prep
// sweep, companion to seo-canonical-consistency.test.ts,
// seo-metadata-completeness.test.ts and seo-indexing-safety.test.ts).
//
// THE RISK THIS GUARDS: `/sitemap.xml` is served header-driven. tenant-routing.ts
// rewrites the request based on BESPOKE_SITE_TENANTS:
//   - slug IN the set     -> rewrite to /site/<slug>/sitemap.xml (the tenant's OWN
//                            sitemap route: a sitemap.ts, a sitemap.xml/ Route
//                            Handler, or a static sitemap.xml).
//   - slug NOT in the set -> rewrite to /site/template/sitemap.xml (the shared,
//                            config-driven template's own real per-tenant sitemap).
// So the set and the on-disk bespoke routes MUST agree, and neither the code
// nor the type checker enforces it:
//   * A slug added to the set with NO sitemap route on disk => middleware
//     rewrites /sitemap.xml to a path that 404s. The flagship tenant losing its
//     sitemap is a silent, real indexing hit that no build error catches.
//   * A site that ships its own /site/<slug> sitemap route but is NOT in the
//     set => middleware silently serves it the generic /site/template sitemap
//     instead while its real one sits unused.
// This file makes both drifts impossible to merge.
//
// Until 2026-08-18 this checked a SECOND, separately-maintained set
// (TENANTS_WITH_RICH_SITEMAP) against a fallback to the thin, selena_config
// -driven /api/tenant-sitemap. That set was always identical in membership to
// BESPOKE_SITE_TENANTS, and any template tenant NOT manually added to it (e.g.
// every cleaning tenant created after the set was last updated) silently fell
// through to the thin fallback instead of the template's real, per-tenant-
// coverage sitemap. The rewrite now uses BESPOKE_SITE_TENANTS directly — one
// list, not two — so this guard was updated to match.
//
// PURE SOURCE-READING, no bundler / no runtime eval, matching the sibling SEO
// tests. The bespoke set is parsed OUT of tenant-routing.ts (the real routing
// rule) rather than hardcoded, so the guard can never disagree with production
// routing. vitest runs with the platform package root as cwd.
//
// HONESTY — what this does NOT check: the runtime HTTP 200 of a served
// /sitemap.xml (that needs a live curl — see
// deploy-prep/sitemap-live-verification-plan.md). This asserts the source-level
// invariant only: a bespoke-set slug always has a sitemap route FILE on disk.

const SITE_ROOT = join(process.cwd(), 'src/app/site')
// BESPOKE_SITE_TENANTS lives in the tenant-routing module (moved out of
// the monolithic src/middleware.ts on 2026-08-01 — see middleware.ts's own
// top-of-file comment for why), not the middleware.ts orchestrator file
// itself.
const MIDDLEWARE = join(process.cwd(), 'src/middleware/tenant-routing.ts')

// `template` is the scaffold every bespoke site is cloned from. It ships its
// own sitemap.xml/ Route Handler and IS routed there — every non-bespoke
// tenant's /sitemap.xml rewrites to it — so it's legitimately absent from
// BESPOKE_SITE_TENANTS and must be excluded from the orphan check below (an
// orphan is a slug shipping a sitemap route nothing routes it to; template's
// route is very much used, just not via this set).
const NON_TENANT_SCAFFOLDS = new Set(['template'])

// Parse `BESPOKE_SITE_TENANTS = new Set<string>(['a', 'b', ...])` out of the
// middleware source (same technique as reconcile-tenant-config.mjs::parseBespokeSet).
function parseBespokeSiteTenants(middlewareSource: string): Set<string> {
  const block = middlewareSource.match(
    /BESPOKE_SITE_TENANTS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/,
  )
  return new Set(
    block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [],
  )
}

// DOMAIN_SITE_SLUG_OVERRIDES (see tenant-routing.ts) routes a specific
// hostname's /sitemap.xml straight to /site/<slug>/sitemap.xml, bypassing
// BESPOKE_SITE_TENANTS entirely (that set is keyed by tenant slug — one
// folder per tenant — while an override lets ONE tenant's second domain
// serve a DIFFERENT folder's sitemap). A folder that's only reachable via an
// override, not via the bespoke set, is not an orphan.
function parseDomainSiteSlugOverrideTargets(middlewareSource: string): Set<string> {
  const block = middlewareSource.match(
    /DOMAIN_SITE_SLUG_OVERRIDES\s*:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\}/,
  )
  if (!block) return new Set()
  // Values are the second quoted string on each `'host': 'slug',` line.
  return new Set(
    [...block[1].matchAll(/['"][^'"]+['"]\s*:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  )
}

// What kind of sitemap route (if any) a /site/<slug> folder serves.
function sitemapRouteKind(slugDir: string): string | null {
  const ts = join(slugDir, 'sitemap.ts')
  if (existsSync(ts) && statSync(ts).isFile()) return 'sitemap.ts'

  const xml = join(slugDir, 'sitemap.xml')
  if (existsSync(xml)) {
    const st = statSync(xml)
    // sitemap.xml/ as a directory is a Route Handler iff it has route.ts
    if (st.isDirectory()) {
      return existsSync(join(xml, 'route.ts')) ? 'sitemap.xml/route.ts' : null
    }
    if (st.isFile()) return 'sitemap.xml (static)'
  }
  return null
}

const middlewareSource = readFileSync(MIDDLEWARE, 'utf8')
const bespokeSet = parseBespokeSiteTenants(middlewareSource)
const domainOverrideTargets = parseDomainSiteSlugOverrideTargets(middlewareSource)

// Every immediate /site/<slug> directory that ships its own sitemap route.
const sitesWithSitemapRoute = readdirSync(SITE_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((slug) => sitemapRouteKind(join(SITE_ROOT, slug)) !== null)

describe('sitemap-presence invariant (bespoke set <-> on-disk routes)', () => {
  it('parses a non-empty BESPOKE_SITE_TENANTS out of middleware.ts', () => {
    // If this fails, the middleware syntax changed and the parser above must be
    // updated — do NOT let the guard silently pass on an empty set.
    expect(bespokeSet.size).toBeGreaterThan(0)
  })

  it('every bespoke tenant has a served sitemap route on disk (no 404 rewrite)', () => {
    const missing = [...bespokeSet].filter(
      (slug) => sitemapRouteKind(join(SITE_ROOT, slug)) === null,
    )
    expect(
      missing,
      `BESPOKE_SITE_TENANTS lists ${missing.length} slug(s) with NO sitemap ` +
        `route under src/app/site — middleware would rewrite /sitemap.xml to a 404: ` +
        `${missing.join(', ')}`,
    ).toEqual([])
  })

  it('parses a non-empty DOMAIN_SITE_SLUG_OVERRIDES out of middleware.ts', () => {
    // If this fails, the override map's syntax changed and the parser above
    // must be updated — do NOT let the guard silently pass on an empty set.
    expect(domainOverrideTargets.size).toBeGreaterThan(0)
  })

  it('no site ships a sitemap route while missing from the bespoke set (no silent fallback)', () => {
    const orphans = sitesWithSitemapRoute.filter(
      (slug) =>
        !bespokeSet.has(slug) &&
        !NON_TENANT_SCAFFOLDS.has(slug) &&
        !domainOverrideTargets.has(slug),
    )
    expect(
      orphans,
      `${orphans.length} site(s) ship their own sitemap route but are absent from ` +
        `BESPOKE_SITE_TENANTS, so middleware serves them the /site/template sitemap ` +
        `instead of their own: ${orphans.join(', ')}`,
    ).toEqual([])
  })
})
