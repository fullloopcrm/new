import { describe, it, expect } from 'vitest'
import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Sitemap-presence regression guard for tenant marketing sites (W3 deploy-prep
// sweep, companion to seo-canonical-consistency.test.ts,
// seo-metadata-completeness.test.ts and seo-indexing-safety.test.ts).
//
// THE RISK THIS GUARDS: `/sitemap.xml` is served header-driven. middleware.ts
// rewrites the request based on TENANTS_WITH_RICH_SITEMAP:
//   - slug IN the set   -> rewrite to /site/<slug>/sitemap.xml (the tenant's OWN
//                          sitemap route: a sitemap.ts, a sitemap.xml/ Route
//                          Handler, or a static sitemap.xml).
//   - slug NOT in the set -> fall back to the generic /api/tenant-sitemap (7 URLs).
// So the set and the on-disk routes MUST agree, and neither the code nor the
// type checker enforces it:
//   * A slug added to the set with NO sitemap route on disk => middleware
//     rewrites /sitemap.xml to a path that 404s. The flagship tenant losing its
//     sitemap is a silent, real indexing hit that no build error catches.
//   * A site that ships its own sitemap route but is NOT in the set => middleware
//     silently serves the thin 7-URL fallback while the rich sitemap sits unused.
// This file makes both drifts impossible to merge.
//
// PURE SOURCE-READING, no bundler / no runtime eval, matching the sibling SEO
// tests. The rich set is parsed OUT of src/middleware.ts (the real routing rule)
// rather than hardcoded, so the guard can never disagree with production
// routing. vitest runs with the platform package root as cwd.
//
// HONESTY — what this does NOT check: the runtime HTTP 200 of a served
// /sitemap.xml (that needs a live curl — see
// deploy-prep/sitemap-live-verification-plan.md). This asserts the source-level
// invariant only: a rich-set slug always has a sitemap route FILE on disk.

const SITE_ROOT = join(process.cwd(), 'src/app/site')
const MIDDLEWARE = join(process.cwd(), 'src/middleware.ts')

// `template` is the scaffold every bespoke site is cloned from. It ships a
// sitemap.xml/ Route Handler but is NEVER routed as a tenant — middleware never
// rewrites /sitemap.xml to /site/template/... — so it is legitimately absent
// from TENANTS_WITH_RICH_SITEMAP and must be excluded from the orphan check.
const NON_TENANT_SCAFFOLDS = new Set(['template'])

// Parse `TENANTS_WITH_RICH_SITEMAP = new Set(['a', 'b', ...])` out of the
// middleware source (same technique as reconcile-tenant-config.mjs::parseBespokeSet).
function parseRichSitemapSet(middlewareSource: string): Set<string> {
  const block = middlewareSource.match(
    /TENANTS_WITH_RICH_SITEMAP\s*=\s*new Set\(\[([\s\S]*?)\]\)/,
  )
  return new Set(
    block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [],
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

const richSet = parseRichSitemapSet(readFileSync(MIDDLEWARE, 'utf8'))

// Every immediate /site/<slug> directory that ships its own sitemap route.
const sitesWithSitemapRoute = readdirSync(SITE_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((slug) => sitemapRouteKind(join(SITE_ROOT, slug)) !== null)

describe('sitemap-presence invariant (middleware rich set <-> on-disk routes)', () => {
  it('parses a non-empty TENANTS_WITH_RICH_SITEMAP out of middleware.ts', () => {
    // If this fails, the middleware syntax changed and the parser above must be
    // updated — do NOT let the guard silently pass on an empty set.
    expect(richSet.size).toBeGreaterThan(0)
  })

  it('every rich-sitemap tenant has a served sitemap route on disk (no 404 rewrite)', () => {
    const missing = [...richSet].filter(
      (slug) => sitemapRouteKind(join(SITE_ROOT, slug)) === null,
    )
    expect(
      missing,
      `TENANTS_WITH_RICH_SITEMAP lists ${missing.length} slug(s) with NO sitemap ` +
        `route under src/app/site — middleware would rewrite /sitemap.xml to a 404: ` +
        `${missing.join(', ')}`,
    ).toEqual([])
  })

  it('no site ships a rich sitemap route while missing from the set (no silent fallback)', () => {
    const orphans = sitesWithSitemapRoute.filter(
      (slug) => !richSet.has(slug) && !NON_TENANT_SCAFFOLDS.has(slug),
    )
    expect(
      orphans,
      `${orphans.length} site(s) ship their own sitemap route but are absent from ` +
        `TENANTS_WITH_RICH_SITEMAP, so middleware serves them the thin 7-URL generic ` +
        `fallback instead: ${orphans.join(', ')}`,
    ).toEqual([])
  })
})
