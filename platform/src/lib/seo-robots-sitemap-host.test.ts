import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// robots.ts sitemap-URL host <-> sitemap.ts base host agreement guard
// (W3 deploy-prep sweep; closes the triangle left open by
// seo-sitemap-canonical-host.test.ts, sibling of sitemap-presence.test.ts and
// the seo-* guards).
//
// THE GAP THIS FILLS — seo-sitemap-canonical-host.test.ts asserts
// sitemap-base host == <link rel="canonical"> host. seo-indexing-safety.test.ts
// reads robots.ts, but ONLY for noindex/nofollow directives. NOTHING checks the
// host of the sitemap URL a tenant's robots.ts advertises. So a tenant can ship
// a robots.ts pointing crawlers at `https://www.example.com/sitemap.xml` while
// its actual sitemap serves apex `https://example.com/...` URLs — a
// robots<->sitemap split-brain that the existing guards miss entirely.
//
// This is NOT hypothetical. deploy-prep/sitemap-apex-clean-full-spec.md flips the
// three APEX_CANONICAL_DOMAINS tenants www -> apex. Exactly ONE of them,
// the-nyc-marketing-company, ships a per-tenant robots.ts whose sitemap URL is a
// separate www literal (robots.ts:12) from the sitemap BASE. A partial apply that
// fixes sitemap.ts + the layout canonical but forgets robots.ts leaves robots
// advertising the www sitemap while the sitemap serves apex — a half-migration
// that no other test catches. This guard makes that fail CI.
//
// Together with the canonical-host guard this closes the triangle:
//   robots.sitemapURL.host == sitemap.base.host  (here)
//   sitemap.base.host      == layout.canonical.host  (sibling)
//   => robots.sitemapURL.host == layout.canonical.host  (transitively)
//
// Today the invariant HOLDS (marketing-company's robots URL and sitemap BASE are
// both www), so this is GREEN. It flips red the moment the two hosts diverge.
//
// PURE SOURCE-READING (no bundler, no runtime eval), matching the sibling guards.
// vitest runs with the platform package root as cwd.
//
// HONESTY — what this does NOT check:
//   * Tenants whose robots or sitemap host is built via a helper/import this
//     parser can't statically resolve are skipped, not asserted. The parser-
//     integrity assertion below prevents the whole guard from silently passing
//     on an empty set.
//   * The live HTTP host (needs curl — see sitemap-www-vs-apex-detection.md).

const SITE_ROOT = join(process.cwd(), 'src/app/site')

// Extract a URL's host, or null if the string isn't a parseable absolute URL.
function hostOf(url: string): string | null {
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

// Every absolute-URL host declared in a tenant's robots.ts `sitemap:` field
// (which Next types as string | string[], so both forms are handled). Empty if
// the tenant has no robots.ts or no static sitemap URL literal.
function robotsSitemapHosts(slug: string): string[] {
  const robots = join(SITE_ROOT, slug, 'robots.ts')
  if (!existsSync(robots)) return []
  const src = readFileSync(robots, 'utf8')
  // Grab the whole `sitemap:` value (array literal or single string), then pull
  // every absolute URL out of it.
  const field = src.match(/sitemap:\s*(\[[^\]]*\]|["'][^"']*["'])/)
  if (!field) return []
  return [...field[1].matchAll(/["'](https?:\/\/[^"']+)["']/g)]
    .map((m) => hostOf(m[1]))
    .filter((h): h is string => h !== null)
}

// The host a tenant's sitemap.ts advertises, resolved from the two static
// patterns in use: a sitemap-local `BASE = "…"` literal, or a `SITE_DOMAIN = "…"`
// constant in _lib/siteData.ts the sitemap consumes. null if neither resolves or
// there's no sitemap. (Same resolution as seo-sitemap-canonical-host.test.ts.)
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

// Every /site/<slug> that ships a per-tenant robots.ts with at least one static
// sitemap-URL host AND a statically-resolvable sitemap base host — the set this
// guard can actually check.
type Checkable = { slug: string; robotsHosts: string[]; sitemap: string }
const checkable: Checkable[] = readdirSync(SITE_ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .map((slug) => ({
    slug,
    robotsHosts: robotsSitemapHosts(slug),
    sitemap: sitemapHost(slug),
  }))
  .filter(
    (c): c is Checkable => c.robotsHosts.length > 0 && c.sitemap !== null,
  )

describe('robots.ts sitemap-URL host <-> sitemap base host agreement (no robots split-brain)', () => {
  it('resolves at least one tenant with both a robots sitemap URL and a sitemap base host', () => {
    // Parser-integrity: if extraction breaks (patterns changed) or the sole
    // covered tenant loses coverage, do NOT let the suite silently pass on an
    // empty set — fail so the guard/parser gets fixed.
    expect(checkable.length).toBeGreaterThan(0)
  })

  it('every robots.ts sitemap URL points at the SAME host its sitemap.ts serves', () => {
    const mismatched = checkable.filter((c) =>
      c.robotsHosts.some((h) => h !== c.sitemap),
    )
    expect(
      mismatched,
      `${mismatched.length} tenant(s) advertise a sitemap URL in robots.ts whose host ` +
        `differs from the host their sitemap.ts actually serves (robots<->sitemap ` +
        `split-brain — crawlers are pointed at a sitemap on a host the site canonicals ` +
        `away from):\n` +
        mismatched
          .map(
            (c) =>
              `  ${c.slug}: robots=[${c.robotsHosts.join(', ')}]  sitemap=${c.sitemap}`,
          )
          .join('\n'),
    ).toEqual([])
  })
})
