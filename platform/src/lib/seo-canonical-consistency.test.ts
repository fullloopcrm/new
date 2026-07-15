import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Regression guard for the W3 SEO meta-consistency sweep
// (deploy-prep/seo-meta-consistency-final.md + seo-remediation-spec.md).
//
// Two invariants, checked per tenant marketing site by reading the site's own
// metadata source (layout.tsx + page.tsx):
//
//   1. Every site declares a `metadataBase` — otherwise relative canonical/OG
//      URLs resolve against Next's default `http://localhost:3000` at build.
//   2. No site's canonical points at a host that `src/middleware.ts` 301-redirects
//      (the apex->www rule). A canonical pointing at a self-redirecting URL makes
//      Google distrust it and index the redirect target instead.
//
// TRACKED-RED: two current defects are codified below. Each KNOWN_* assertion
// EXPECTS the bug to still be present, so `npm test` stays green today. When
// someone applies the fix in seo-remediation-spec.md, the matching assertion
// FAILS on purpose — that failure is the signal to delete the slug from the set
// and let the site be guarded as coherent. This makes the bug impossible to
// forget and impossible to "fix-and-drift" silently.
//
// vitest runs with the platform package root as cwd.

const SITE_ROOT = join(process.cwd(), 'src/app/site')
const MIDDLEWARE = join(process.cwd(), 'src/middleware.ts')

// --- tracked-RED defects (see deploy-prep/seo-remediation-spec.md) ---
const KNOWN_CANONICAL_REDIRECT = new Set<string>([
  // Flag 2: canonical/base/OG all declare bare apex `thenycmobilesalon.com`,
  // which is NOT in APEX_CANONICAL_DOMAINS, so middleware 301s it apex->www.
  'nyc-mobile-salon',
])
const KNOWN_MISSING_BASE = new Set<string>([
  // Flag 5: metadata lives only in page.tsx with absolute root URLs; no
  // metadataBase anywhere, so relative subpage URLs resolve to localhost.
  'the-florida-maid',
  'sunnyside-clean-nyc',
])

// Real marketing tenants that lack a sitemap.ts (so the sitemap-based discovery
// below would miss them) but still ship brand metadata worth guarding.
const EXTRA_SITES = ['wash-and-fold-hoboken', 'nyc-classifieds']

// --- site discovery ---
// A `sitemap.ts` at the site root is the clean "independent marketing site"
// signal. src/app/site/ also contains flattened nycmaid route-segment dirs
// (apply, book, reviews, ...) and a config-driven `template` — none of which
// own a sitemap.ts, so they're correctly excluded.
function discoverSites(): string[] {
  const dirs = readdirSync(SITE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const withSitemap = dirs.filter((d) => existsSync(join(SITE_ROOT, d, 'sitemap.ts')))
  return [...new Set([...withSitemap, ...EXTRA_SITES])].sort()
}

// Concatenated site-root metadata sources. metadataBase/canonical may live in
// either layout.tsx (most sites) or page.tsx (the-florida-maid, sunnyside).
function readSource(slug: string): string {
  let src = ''
  for (const f of ['layout.tsx', 'page.tsx']) {
    const p = join(SITE_ROOT, slug, f)
    if (existsSync(p)) src += '\n' + readFileSync(p, 'utf8')
  }
  return src
}

function safeHost(u: string): string | null {
  try {
    return new URL(u).host.toLowerCase()
  } catch {
    return null
  }
}

function hasMetadataBase(src: string): boolean {
  return /metadataBase\s*:/.test(src)
}

// Resolve the metadataBase host if it's statically knowable:
//   new URL('https://literal')        -> parsed host
//   new URL(SITE_URL)                 -> resolve SITE_URL literal in the site dir
//   new URL(process.env... || '...')  -> null (build-time env, unknowable here)
function metadataBaseHost(slug: string, src: string): string | null {
  const m = src.match(/metadataBase\s*:\s*new URL\(([^)]*)\)/)
  if (!m) return null
  const arg = m[1].trim()
  const lit = arg.match(/^['"](https?:\/\/[^'"]+)['"]$/)
  if (lit) return safeHost(lit[1])
  if (/process\.env/.test(arg)) return null
  if (/SITE_URL/.test(arg)) {
    const su = resolveSiteUrl(slug)
    return su ? safeHost(su) : null
  }
  return null
}

function resolveSiteUrl(slug: string): string | null {
  const candidates = [
    join(SITE_ROOT, slug, 'layout.tsx'),
    join(SITE_ROOT, slug, '_lib', 'seo.ts'),
  ]
  for (const p of candidates) {
    if (!existsSync(p)) continue
    const m = readFileSync(p, 'utf8').match(/SITE_URL\s*=\s*['"](https?:\/\/[^'"]+)['"]/)
    if (m) return m[1]
  }
  return null
}

// A canonical host is only "resolvable" when the canonical is a plain string
// literal. An env-gated canonical (process.env... || '...') has an unknowable
// built value, so it's treated as unresolved and skipped (covered by the spec,
// not this test).
function canonicalLiteral(src: string): string | null {
  const m = src.match(/canonical\s*:\s*(['"][^'"]*['"]|process\.env[^,\n}]*)/)
  if (!m) return null
  const raw = m[1].trim()
  if (/process\.env/.test(raw)) return null
  return raw.slice(1, -1)
}

function effectiveCanonicalHost(slug: string, src: string): string | null {
  const c = canonicalLiteral(src)
  if (c == null) return null
  if (/^https?:\/\//.test(c)) return safeHost(c)
  // relative canonical ('/', '/path') resolves against metadataBase host
  return metadataBaseHost(slug, src)
}

// Derived from middleware source so the test can't drift from the real set.
function apexCanonicalDomains(): Set<string> {
  const mw = readFileSync(MIDDLEWARE, 'utf8')
  const block = mw.match(/APEX_CANONICAL_DOMAINS\s*=\s*new Set<string>\(\[([\s\S]*?)\]\)/)
  if (!block) throw new Error('Could not locate APEX_CANONICAL_DOMAINS in middleware.ts')
  return new Set([...block[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1].toLowerCase()))
}

const APEX = apexCanonicalDomains()

// Mirror of the apex->www 301 predicate in src/middleware.ts (page paths).
// True => a GET to this host is 301'd to its www. equivalent.
function redirectsApexToWww(host: string): boolean {
  return (
    !host.startsWith('www.') &&
    !APEX.has(host) &&
    host !== 'localhost' &&
    host.includes('.') &&
    !host.endsWith('.vercel.app') &&
    !host.endsWith('.fullloopcrm.com') &&
    !host.endsWith('.homeservicesbusinesscrm.com') &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(host)
  )
}

const sites = discoverSites()

describe('SEO canonical / metadataBase consistency (per tenant site)', () => {
  it('discovery finds the tenant marketing sites, including the flagged ones', () => {
    expect(sites.length).toBeGreaterThanOrEqual(20)
    for (const s of [
      'nyc-mobile-salon',
      'the-florida-maid',
      'sunnyside-clean-nyc',
      'wash-and-fold-hoboken',
      'nyc-classifieds',
    ]) {
      expect(sites, `discovery must include ${s}`).toContain(s)
    }
  })

  it('derives APEX_CANONICAL_DOMAINS from middleware without drift', () => {
    expect(APEX.size).toBeGreaterThan(0)
    expect(APEX.has('consortiumnyc.com')).toBe(true)
  })

  describe('metadataBase is set for every site', () => {
    for (const slug of sites) {
      it(`${slug}`, () => {
        const has = hasMetadataBase(readSource(slug))
        if (KNOWN_MISSING_BASE.has(slug)) {
          expect(
            has,
            `${slug} is tracked-RED for missing metadataBase (Flag 5). When fixed, remove it from KNOWN_MISSING_BASE.`,
          ).toBe(false)
        } else {
          expect(
            has,
            `${slug} must declare metadataBase so relative canonical/OG URLs don't resolve to localhost.`,
          ).toBe(true)
        }
      })
    }
  })

  describe("no site's canonical points at a host middleware 301-redirects", () => {
    for (const slug of sites) {
      it(`${slug}`, () => {
        const host = effectiveCanonicalHost(slug, readSource(slug))
        if (host == null) {
          // No statically resolvable canonical host (env-gated, e.g.
          // nyc-classifieds, or no root canonical literal). Redirect check is
          // N/A; metadataBase presence is covered by the block above.
          return
        }
        const redirects = redirectsApexToWww(host)
        if (KNOWN_CANONICAL_REDIRECT.has(slug)) {
          expect(
            redirects,
            `${slug} is tracked-RED: canonical host ${host} is apex->www 301'd (Flag 2). When fixed, remove it from KNOWN_CANONICAL_REDIRECT.`,
          ).toBe(true)
        } else {
          expect(
            redirects,
            `${slug} canonical host ${host} 301-redirects (apex->www); the canonical must point at the final host.`,
          ).toBe(false)
        }
      })
    }
  })
})
