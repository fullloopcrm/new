import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

// Indexing-safety regression guard for tenant marketing sites (W3 deploy-prep
// sweep, companion to seo-canonical-consistency.test.ts and
// seo-metadata-completeness.test.ts).
//
// THE RISK THIS GUARDS: a `robots: { index: false }` (or `follow: false`, or a
// `noindex`/`nofollow`/`none` string) is a one-line change that silently pulls a
// page out of Google's index. On a thin programmatic combo that's correct and
// intentional. On a marketing landing / money page it is a self-inflicted
// deindex that no build error, type check, or smoke test catches — the page
// still renders perfectly, it just quietly stops ranking. This file makes any
// NEW noindex page impossible to add without a reviewer noticing.
//
// TWO INVARIANTS, both by pure source-reading (no bundler / no runtime eval),
// matching the sibling SEO tests' philosophy. vitest runs with the platform
// package root as cwd.
//
//   1. The set of pages under src/app/site that emit a noindex/nofollow robots
//      directive is EXACTLY the documented INTENTIONAL_NOINDEX allowlist below.
//        - A new noindex page not in the allowlist  -> FAIL (review it: is the
//          deindex intended? if so, add it here with a reason).
//        - An allowlisted page that no longer emits noindex -> FAIL (drift:
//          remove it from the allowlist so the guard stays honest).
//   2. No discovered tenant SITE has its ROOT metadata (top-level layout.tsx /
//      page.tsx) emit noindex. The homepage/primary landing must never be
//      deindexed — this is the highest-value assertion in the file.
//
// SCANNER SCOPE (honesty): this reads INLINE `robots:` literals and string
// forms only. Sites here set robots inline; the one shared metadata helper
// (nyc-classifieds `_lib/seo.ts::buildMetadata`) does NOT set robots, so its
// callers that need noindex add it inline (and are caught below). If a future
// helper starts injecting robots dynamically, this scanner won't see it —
// extend it then.

const SITE_ROOT = join(process.cwd(), 'src/app/site')

// Kept in sync with the sibling SEO tests: real marketing tenants that lack a
// sitemap.ts (so sitemap-based discovery misses them) but still ship metadata.
const EXTRA_SITES = ['wash-and-fold-hoboken', 'nyc-classifieds']

// --- the intentional noindex allowlist (path relative to src/app/site) ---
// Every entry is a page that SHOULD be out of the index, with the reason it is.
// Two families:
//   * thin programmatic geo×service / neighborhood×service combos — kept
//     crawlable (follow) for internal link equity but out of the index to
//     protect overall site quality.
//   * nyc-classifieds is a logged-in USER APP (not a marketing brochure); its
//     auth / account / messaging / notification / new-listing / search screens
//     are utility pages with no search value and are correctly noindexed.
const INTENTIONAL_NOINDEX: Record<string, string> = {
  'template/virtual-assistant/[location]/[service]/page.tsx':
    'thin geo×service programmatic combos, near-duplicate at national scale (follow kept)',
  'sunnyside-clean-nyc/[slug]/[service]/page.tsx':
    'thin neighborhood×service programmatic combos (follow kept for link equity)',
  'nyc-classifieds/listings/new/page.tsx': 'authed create form — no search value',
  'nyc-classifieds/messages/page.tsx': 'private user messaging — must not be indexed',
  'nyc-classifieds/messages/[threadId]/page.tsx': 'private message thread — must not be indexed',
  'nyc-classifieds/search/page.tsx': 'faceted search results — crawl trap (follow kept)',
  'nyc-classifieds/notifications/page.tsx': 'authed notifications feed — no search value',
  'nyc-classifieds/account/page.tsx': 'authed account settings — no search value',
  'nyc-classifieds/(auth)/login/page.tsx': 'auth screen — no search value',
  'nyc-classifieds/(auth)/signup/page.tsx': 'auth screen — no search value',
  'nyc-classifieds/(auth)/forgot-pin/page.tsx': 'auth screen — no search value',
}

// --- site discovery (same rule as the sibling tests) ---
function discoverSites(): string[] {
  const dirs = readdirSync(SITE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const withSitemap = dirs.filter((d) => existsSync(join(SITE_ROOT, d, 'sitemap.ts')))
  return [...new Set([...withSitemap, ...EXTRA_SITES])].sort()
}

// Every .ts/.tsx file under src/app/site, as absolute paths.
function allSiteSourceFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
    }
  }
  walk(SITE_ROOT)
  return out
}

// Normalize an absolute path under SITE_ROOT to a forward-slash relative key
// so allowlist keys match on every platform.
function relKey(absPath: string): string {
  return relative(SITE_ROOT, absPath).split(sep).join('/')
}

// Balanced scan from an opening brace/bracket to its match, string-aware.
function balancedExpr(src: string, openIdx: number): string {
  let depth = 0
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i]
    if (c === '"' || c === "'" || c === '`') {
      const q = c
      i++
      while (i < src.length && src[i] !== q) {
        if (src[i] === '\\') i++
        i++
      }
      continue
    }
    if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      if (depth === 0) return src.slice(openIdx, i + 1)
    }
  }
  return src.slice(openIdx)
}

// Does this source emit a noindex/nofollow robots directive?
// Recognizes both metadata forms Next.js accepts:
//   robots: { index: false, ... }   /  robots: { follow: false }
//   robots: { googleBot: { index: false } }        (nested)
//   robots: 'noindex, nofollow'      /  robots: 'none'
// A robots block that only sets index:true/follow:true (the explicit-indexable
// pattern several sites use) is NOT flagged.
function emitsNoindex(src: string): boolean {
  const re = /robots\s*:\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    let i = m.index + m[0].length
    while (i < src.length && /\s/.test(src[i])) i++
    const c = src[i]
    if (c === '{') {
      const block = balancedExpr(src, i)
      if (/\bindex\s*:\s*false\b/.test(block)) return true
      if (/\bfollow\s*:\s*false\b/.test(block)) return true
      if (/['"`](?:[^'"`]*\b)?(?:noindex|nofollow|none)\b[^'"`]*['"`]/i.test(block)) return true
    } else if (c === '"' || c === "'" || c === '`') {
      const strLit = balancedString(src, i)
      if (/\b(?:noindex|nofollow|none)\b/i.test(strLit)) return true
    }
  }
  return false
}

// Read a quoted string literal (incl. its quotes) starting at a quote char.
function balancedString(src: string, openIdx: number): string {
  const q = src[openIdx]
  let i = openIdx + 1
  while (i < src.length && src[i] !== q) {
    if (src[i] === '\\') i++
    i++
  }
  return src.slice(openIdx, i + 1)
}

// The two files that hold a site's ROOT metadata (top-level, NOT nested routes).
function rootMetadataFiles(slug: string): string[] {
  return ['layout.tsx', 'page.tsx']
    .map((f) => join(SITE_ROOT, slug, f))
    .filter((p) => existsSync(p))
}

// Compute the actual set of noindex-emitting files once.
const noindexFiles = allSiteSourceFiles()
  .filter((p) => emitsNoindex(readFileSync(p, 'utf8')))
  .map(relKey)
  .sort()

const sites = discoverSites()

describe('SEO indexing safety (no unintentional noindex/nofollow)', () => {
  it('scanner finds the tenant sites and at least the known noindex pages', () => {
    expect(sites.length).toBeGreaterThanOrEqual(20)
    // Sanity: the scanner is actually detecting robots directives, not silently
    // matching nothing (which would make every assertion below vacuously pass).
    expect(noindexFiles.length).toBeGreaterThanOrEqual(Object.keys(INTENTIONAL_NOINDEX).length)
  })

  describe('every noindex page is on the intentional allowlist', () => {
    // Drives per-file `it`s so a new offender names itself in the failure.
    for (const rel of noindexFiles) {
      it(`${rel}`, () => {
        expect(
          rel in INTENTIONAL_NOINDEX,
          `${rel} emits a noindex/nofollow robots directive but is NOT on the INTENTIONAL_NOINDEX allowlist. ` +
            `If this deindex is intended, add it to the allowlist with a reason. If not, remove the robots directive — ` +
            `this page is being pulled out of Google's index.`,
        ).toBe(true)
      })
    }
  })

  describe('every allowlisted page still actually emits noindex (no stale entries)', () => {
    const actual = new Set(noindexFiles)
    for (const rel of Object.keys(INTENTIONAL_NOINDEX)) {
      it(`${rel}`, () => {
        expect(
          actual.has(rel),
          `${rel} is on the INTENTIONAL_NOINDEX allowlist but no longer emits a noindex directive. ` +
            `Remove it from the allowlist so this guard stays honest.`,
        ).toBe(true)
      })
    }
  })

  describe("no site's ROOT metadata is noindex (homepage deindex guard)", () => {
    for (const slug of sites) {
      it(`${slug}`, () => {
        for (const file of rootMetadataFiles(slug)) {
          const src = readFileSync(file, 'utf8')
          expect(
            emitsNoindex(src),
            `${relKey(file)} is the ROOT metadata for tenant site "${slug}" and it emits noindex/nofollow. ` +
              `The homepage/primary landing must never be deindexed.`,
          ).toBe(false)
        }
      })
    }
  })
})
