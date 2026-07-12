import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Sitemap-host <-> canonical-host agreement guard (W3 deploy-prep sweep; sibling
// of sitemap-presence.test.ts and the seo-* guards).
//
// THE RISK THIS GUARDS — a "split-brain host": a bespoke site whose sitemap
// advertises one host (e.g. the apex) while its <link rel="canonical"> advertises
// another (e.g. www). Google then sees a sitemap full of URLs that each canonical
// away to a different host — "Page with redirect", diluted/duplicated indexing.
//
// This is not hypothetical: deploy-prep/sitemap-apex-fix-plan.md moves the three
// APEX_CANONICAL_DOMAINS tenants' sitemap base from www -> apex. For two of them
// (consortium-nyc, the-nyc-marketing-company) the sitemap base is a LOCAL literal
// separate from the layout canonical literal, and for the-nyc-interior-designer
// the layout canonical/og/metadataBase are hardcoded www literals NOT driven by
// the SITE_DOMAIN constant the sitemap uses. So applying that sitemap fix WITHOUT
// also flipping the layout canonical would create exactly this split-brain. This
// test makes that half-migration fail CI instead of shipping silently.
//
// Today the invariant HOLDS (every site is uniformly www across sitemap and
// canonical), so this is green. It flips red the moment the two hosts diverge.
//
// PURE SOURCE-READING (no bundler, no runtime eval), matching the sibling guards.
// vitest runs with the platform package root as cwd.
//
// HONESTY — what this does NOT check:
//   * Sites whose sitemap builds its base via a helper/import this parser can't
//     statically resolve (neither a `BASE = "…"` literal nor a resolvable
//     SITE_DOMAIN) are skipped — not asserted. The APEX-coverage test below
//     guarantees the three highest-risk tenants are never silently skipped.
//   * The live HTTP host of a served page (needs curl — see
//     sitemap-www-vs-apex-detection.md). This is the source-level invariant only.

const SITE_ROOT = join(process.cwd(), 'src/app/site')
const MIDDLEWARE = join(process.cwd(), 'src/middleware.ts')

// Parse `APEX_CANONICAL_DOMAINS = new Set<string>(['a', 'b', ...])` out of
// middleware (same technique as sitemap-presence.test.ts::parseRichSitemapSet).
function parseApexDomains(src: string): Set<string> {
  const block = src.match(
    /APEX_CANONICAL_DOMAINS\s*=\s*new Set<[^>]*>\(\[([\s\S]*?)\]\)/,
  )
  return new Set(
    block ? [...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]) : [],
  )
}

// Extract a URL's host, or null if the string isn't a parseable absolute URL.
function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

// The host a site's root layout advertises as canonical, or null if absent/dynamic.
function canonicalHost(slug: string): string | null {
  const layout = join(SITE_ROOT, slug, 'layout.tsx')
  if (!existsSync(layout)) return null
  const m = readFileSync(layout, 'utf8').match(
    /canonical:\s*["'](https?:\/\/[^"']+)["']/,
  )
  return m ? hostOf(m[1]) : null
}

// The host a site's sitemap advertises, resolved from the two static patterns in
// use: a sitemap-local `BASE = "…"` literal, or a `SITE_DOMAIN = "…"` constant in
// the site's _lib/siteData.ts that the sitemap consumes. null if neither resolves
// (built via a helper we can't follow statically) or there's no sitemap.
function sitemapHost(slug: string): string | null {
  const sitemap = join(SITE_ROOT, slug, 'sitemap.ts')
  if (!existsSync(sitemap)) return null
  const src = readFileSync(sitemap, 'utf8')

  const baseLit = src.match(/BASE\s*=\s*["'](https?:\/\/[^"']+)["']/)
  if (baseLit) return hostOf(baseLit[1])

  if (/\bSITE_DOMAIN\b/.test(src)) {
    const siteData = join(SITE_ROOT, slug, '_lib/siteData.ts')
    if (existsSync(siteData)) {
      const dom = readFileSync(siteData, 'utf8').match(
        /SITE_DOMAIN\s*=\s*["'](https?:\/\/[^"']+)["']/,
      )
      if (dom) return hostOf(dom[1])
    }
  }
  return null
}

// Every /site/<slug> where BOTH a sitemap host and a canonical host are statically
// resolvable — the set this guard can actually check.
type Pair = { slug: string; sitemap: string; canonical: string }
const checkable: Pair[] = readdirSync(SITE_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .map((slug) => ({ slug, sitemap: sitemapHost(slug), canonical: canonicalHost(slug) }))
  .filter((p): p is Pair => p.sitemap !== null && p.canonical !== null)

const apexDomains = parseApexDomains(readFileSync(MIDDLEWARE, 'utf8'))

describe('sitemap-host <-> canonical-host agreement (no split-brain host)', () => {
  it('resolves at least one site with both a sitemap and a canonical host', () => {
    // Guards the parsers: if extraction breaks (patterns changed), do NOT let the
    // suite silently pass on an empty checkable set.
    expect(checkable.length).toBeGreaterThan(0)
  })

  it('every resolvable site advertises the SAME host in its sitemap and canonical tag', () => {
    const mismatched = checkable.filter((p) => p.sitemap !== p.canonical)
    expect(
      mismatched,
      `${mismatched.length} site(s) advertise a different host in their sitemap vs ` +
        `their <link rel="canonical"> (split-brain — sitemap URLs canonical away to ` +
        `another host):\n` +
        mismatched
          .map((p) => `  ${p.slug}: sitemap=${p.sitemap}  canonical=${p.canonical}`)
          .join('\n'),
    ).toEqual([])
  })

  it('every APEX_CANONICAL_DOMAINS tenant is actually covered by this guard', () => {
    // The apex trio is where the www->apex fix concentrates the split-brain risk.
    // Map each apex domain to its tenant by matching the canonical host with any
    // leading "www." stripped. If a domain has no covered tenant, the guard would
    // silently skip the highest-risk site — fail instead so the parser gets fixed.
    expect(apexDomains.size, 'parsed no APEX_CANONICAL_DOMAINS from middleware').toBeGreaterThan(0)
    const coveredApexHosts = new Set(
      checkable.map((p) => p.canonical.replace(/^www\./, '')),
    )
    const uncovered = [...apexDomains].filter((d) => !coveredApexHosts.has(d))
    expect(
      uncovered,
      `apex-canonical domain(s) with no host-checked tenant (sitemap/canonical ` +
        `extraction failed for them): ${uncovered.join(', ')}`,
    ).toEqual([])
  })
})
