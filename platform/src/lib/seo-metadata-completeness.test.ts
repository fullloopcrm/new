import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Completeness regression guard for tenant-site metadata (W3 deploy-prep sweep,
// companion to seo-canonical-consistency.test.ts).
//
// One invariant, checked per tenant marketing site by reading the site's own
// metadata source (layout.tsx + page.tsx):
//
//   Every site's root metadata declares a NON-EMPTY `title` AND a NON-EMPTY
//   `description`. A blank/absent title or description is what search engines
//   and social cards fall back to a URL or the first stray sentence for.
//
// Why this file exists — the florida-maid / sunnyside "gap":
//   Most sites inline their metadata as string literals in layout.tsx, so a
//   naive `title: '…'` check would find them. But `the-florida-maid` and
//   `sunnyside-clean-nyc` put metadata in page.tsx and source title/description
//   INDIRECTLY from a content module:
//     title:       { absolute: content.title }
//     description:  content.metaDescription
//   A test that only string-matched literals would report those two sites as
//   "empty" (a false gap) or skip them entirely (a blind spot). This test
//   resolves the indirection into the site's content module and confirms a real
//   non-empty string backs it — turning that blind spot into a guarded
//   regression. If someone later empties `homepageContent().title`, this fails.
//
// Pure source-reading (no bundler / no runtime eval), matching the sibling
// test's philosophy. vitest runs with the platform package root as cwd.

const SITE_ROOT = join(process.cwd(), 'src/app/site')

// Real marketing tenants that lack a sitemap.ts (so sitemap-based discovery
// would miss them) but still ship brand metadata worth guarding. Kept in sync
// with seo-canonical-consistency.test.ts.
const EXTRA_SITES = ['wash-and-fold-hoboken', 'nyc-classifieds']

// --- site discovery (same rule as the canonical-consistency test) ---
function discoverSites(): string[] {
  const dirs = readdirSync(SITE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
  const withSitemap = dirs.filter((d) => existsSync(join(SITE_ROOT, d, 'sitemap.ts')))
  return [...new Set([...withSitemap, ...EXTRA_SITES])].sort()
}

// Concatenated site-root metadata sources. The primary `metadata` /
// `generateMetadata` may live in layout.tsx (most sites) or page.tsx
// (the-florida-maid, sunnyside-clean-nyc).
function readRootSource(slug: string): string {
  let src = ''
  for (const f of ['layout.tsx', 'page.tsx']) {
    const p = join(SITE_ROOT, slug, f)
    if (existsSync(p)) src += '\n' + readFileSync(p, 'utf8')
  }
  return src
}

// Every .ts/.tsx under a site dir, concatenated. Used only to resolve a
// `content.title`-style indirection back to the literal it references.
function readSiteBlob(slug: string): string {
  const out: string[] = []
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(readFileSync(p, 'utf8'))
    }
  }
  walk(join(SITE_ROOT, slug))
  return out.join('\n')
}

// Does `<prop>: '<non-empty>'` appear as a string literal anywhere in the site?
// Used to resolve an indirection target (e.g. `content.metaDescription` ->
// look for `metaDescription: '…'` in the content module).
function propHasNonEmptyLiteral(slug: string, prop: string): boolean {
  const blob = readSiteBlob(slug)
  const re = new RegExp(prop + "\\s*:\\s*(['\"`])([\\s\\S]*?)\\1", 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(blob)) !== null) {
    if (m[2].trim().length > 0) return true
  }
  return false
}

// Balanced scan from an opening '{' or '[' to its matching close, string-aware.
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

// Map top-level `key: value` pairs of an object body (braces included) to the
// value's source expression. String/brace/bracket-aware so nested objects and
// commas inside strings don't break the split.
function topLevelEntries(body: string): Record<string, string> {
  const inner = body.slice(1, -1)
  const entries: Record<string, string> = {}
  let i = 0
  let depth = 0
  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i++
    const km = inner.slice(i).match(/^(['"`]?)([A-Za-z_$][\w$]*|\[[^\]]*\])\1\s*:/)
    if (!km) {
      i++
      continue
    }
    const key = km[2]
    i += km[0].length
    while (i < inner.length && /\s/.test(inner[i])) i++
    const start = i
    while (i < inner.length) {
      const c = inner[i]
      if (c === '"' || c === "'" || c === '`') {
        const q = c
        i++
        while (i < inner.length && inner[i] !== q) {
          if (inner[i] === '\\') i++
          i++
        }
        i++
        continue
      }
      if (c === '{' || c === '[') depth++
      else if (c === '}' || c === ']') depth--
      else if (c === ',' && depth === 0) break
      i++
    }
    entries[key] = inner.slice(start, i).trim()
    i++
  }
  return entries
}

// Every `metadata` / `generateMetadata` object body in a source string.
function metadataBodies(src: string): string[] {
  const bodies: string[] = []
  const re =
    /export\s+const\s+metadata\b[^=]*=\s*|export\s+(?:async\s+)?function\s+generateMetadata[\s\S]*?return\s*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) {
    const brace = src.indexOf('{', m.index + m[0].length - 1)
    if (brace >= 0) bodies.push(balancedExpr(src, brace))
  }
  return bodies
}

// Does a value expression resolve to a non-empty string?
//   'literal'                         -> non-empty check
//   { default: '…' } / { absolute: … } / any nested literal -> recurse
//   ident.prop  (indirection)         -> resolve via the site's content module
function valueNonEmpty(slug: string, expr: string | undefined): boolean {
  if (expr == null) return false
  const lit = expr.match(/^(['"`])([\s\S]*?)\1/)
  if (lit) return lit[2].trim().length > 0
  if (expr.startsWith('{')) {
    const e = topLevelEntries(expr)
    for (const k of ['default', 'absolute']) {
      if (k in e && valueNonEmpty(slug, e[k])) return true
    }
    const anyLit = expr.match(/(['"`])([\s\S]*?)\1/)
    if (anyLit && anyLit[2].trim().length > 0) return true
    const ind = expr.match(/([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/)
    if (ind) return propHasNonEmptyLiteral(slug, ind[2])
    return false
  }
  const ind = expr.match(/([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/)
  if (ind) return propHasNonEmptyLiteral(slug, ind[2])
  return false
}

// True if any root metadata block declares a non-empty value for `key`.
function siteMetaNonEmpty(slug: string, key: 'title' | 'description'): boolean {
  const src = readRootSource(slug)
  for (const body of metadataBodies(src)) {
    const e = topLevelEntries(body)
    if (key in e && valueNonEmpty(slug, e[key])) return true
  }
  return false
}

const sites = discoverSites()

describe('SEO metadata completeness (per tenant site)', () => {
  it('discovery finds the tenant marketing sites, including the indirection cases', () => {
    expect(sites.length).toBeGreaterThanOrEqual(20)
    for (const s of ['the-florida-maid', 'sunnyside-clean-nyc', 'nyc-classifieds']) {
      expect(sites, `discovery must include ${s}`).toContain(s)
    }
  })

  describe('every site declares a non-empty title', () => {
    for (const slug of sites) {
      it(`${slug}`, () => {
        expect(
          siteMetaNonEmpty(slug, 'title'),
          `${slug} root metadata (layout.tsx/page.tsx) must declare a non-empty title.`,
        ).toBe(true)
      })
    }
  })

  describe('every site declares a non-empty description', () => {
    for (const slug of sites) {
      it(`${slug}`, () => {
        expect(
          siteMetaNonEmpty(slug, 'description'),
          `${slug} root metadata (layout.tsx/page.tsx) must declare a non-empty description.`,
        ).toBe(true)
      })
    }
  })

  // Codifies the florida-maid / sunnyside gap explicitly: their title and
  // description are NOT inline literals — they come from a content module via
  // `content.title` / `content.metaDescription`. This asserts the indirection
  // is real (a `content.<prop>` reference in the root source) AND that the
  // content module backs it with non-empty strings. If a refactor inlines them,
  // the indirection assertion fails loudly so this guard can be revisited rather
  // than silently passing on a stale assumption.
  describe('indirection-sourced sites resolve to non-empty content', () => {
    for (const slug of ['the-florida-maid', 'sunnyside-clean-nyc']) {
      it(`${slug} sources title+description from a content module`, () => {
        const src = readRootSource(slug)
        expect(
          /content\.title/.test(src),
          `${slug} is expected to reference content.title; if this changed, update this guard.`,
        ).toBe(true)
        expect(
          /content\.metaDescription/.test(src),
          `${slug} is expected to reference content.metaDescription; if this changed, update this guard.`,
        ).toBe(true)
        expect(propHasNonEmptyLiteral(slug, 'title')).toBe(true)
        expect(propHasNonEmptyLiteral(slug, 'metaDescription')).toBe(true)
      })
    }
  })
})
