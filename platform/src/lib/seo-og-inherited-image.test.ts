import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// SEO guard — OG/Twitter IMAGE INHERITANCE (W3 SEO sign-off, category §1, C2).
//
// The OG coverage audit (deploy-prep/og-image-coverage-audit.md, finding C2)
// found six tenant sites whose `layout.tsx` declares an `openGraph`/`twitter`
// block WITHOUT an `images` key and ships no own `opengraph-image.tsx`. Per
// Next.js's file-convention metadata resolution, a route segment with no
// explicit `images` and no local `opengraph-image.*` file falls back to the
// NEAREST ANCESTOR's `opengraph-image.tsx` — here, `src/app/site/opengraph-image.tsx`,
// which renders "The NYC Maid" branded card. A tow-truck, exterminator, or
// dumpster-rental site sharing a maid-service social card is a brand-integrity
// defect on every link share.
//
// This upgrades the audit's "confirm inheritance against built HTML" caveat to
// a STATIC fact for the FILE-CONVENTION mechanism itself: file-based image
// metadata resolution is a compile-time route-tree lookup, not runtime logic —
// "no local images key + no local opengraph-image.* file" deterministically
// means the ancestor file generates the card. What this guard does NOT confirm
// is the final rendered bytes (caching, CDN, or a build-time error) — that
// still needs the post-deploy live OG-card validator per the sign-off doc.
//
// TRACKED-RED convention (matches seo-og-image-assets.test.ts): known-inheriting
// sites are frozen in INHERITS_PARENT_OG_BASELINE. Green today; FLIPS TO FAIL if
// (a) a NEW site starts inheriting (regression), or (b) a tracked site is fixed
// (own opengraph-image.tsx added, or an explicit images key set) — the signal to
// delete its baseline entry. Fix + baseline-entry removal is one atomic change.
//
// NEW FINDING while writing this guard (not in the original C2 list): `apply` —
// the shared, tenant-agnostic job-application route (`generateMetadata()` reads
// `getTenantFromHeaders()`) — also has no `images` key and no own
// `opengraph-image.tsx`, so EVERY tenant's `/apply` page inherits the same
// NYC-Maid card too. Added to the tracked baseline; distinct category from the
// six per-tenant homepages (one route serving all tenants, not one tenant).
//
// SCOPE: only the site's own directory (`layout.tsx` + any `opengraph-image.*`
// sibling) — matches the audit's scope. Deeper nested routes with their own
// image files are out of scope here. Pure source + fs — no build, no network.

const SITE_ROOT = join(process.cwd(), 'src', 'app', 'site')

const OWN_IMAGE_FILE_RE = /^opengraph-image\.(tsx|jsx|ts|js)$/

// `${site}::inherits-parent-og` — six per-tenant homepages (audit C2) + the
// shared /apply route (new finding, this session).
const INHERITS_PARENT_OG_BASELINE: ReadonlySet<string> = new Set([
  'nyc-tow',
  'toll-trucks-near-me',
  'the-nyc-exterminator',
  'the-nyc-seo',
  'the-home-services-company',
  'fla-dumpster-rentals',
  'apply',
])

// Extract a top-level `key: { ... }` block by brace-balancing (values may
// contain nested `{ }`, e.g. an `images: [{ url: … }]` array of objects).
function extractBlock(source: string, key: string): string | null {
  const m = new RegExp(`${key}\\s*:\\s*\\{`).exec(source)
  if (!m) return null
  const start = m.index + m[0].length - 1 // index of the opening '{'
  let depth = 0
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return source.slice(start)
}

function sitesInheritingParentOg(): string[] {
  const found: string[] = []
  for (const dirent of readdirSync(SITE_ROOT, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue
    const site = dirent.name
    const dir = join(SITE_ROOT, site)
    const layoutFile = join(dir, 'layout.tsx')
    if (!existsSync(layoutFile)) continue

    const hasOwnImageFile = readdirSync(dir).some((f) => OWN_IMAGE_FILE_RE.test(f))
    if (hasOwnImageFile) continue // own opengraph-image.* wins — not inheriting

    const source = readFileSync(layoutFile, 'utf8')
    const og = extractBlock(source, 'openGraph')
    const tw = extractBlock(source, 'twitter')
    if (!og && !tw) continue // no OG/Twitter block at all — different case, not this detector

    const ogHasImages = !!og && /\bimages\s*:/.test(og)
    const twHasImages = !!tw && /\bimages\s*:/.test(tw)
    if (!ogHasImages && !twHasImages) found.push(site)
  }
  return found.sort()
}

describe('SEO — OG/Twitter image inheritance (C2: shared NYC-Maid card)', () => {
  it('finds the shared ancestor opengraph-image.tsx the inheriting sites fall back to', () => {
    expect(
      existsSync(join(SITE_ROOT, 'opengraph-image.tsx')),
      'src/app/site/opengraph-image.tsx (the NYC-Maid branded ancestor image) is missing — ' +
        're-verify this guard\'s premise before trusting its result.',
    ).toBe(true)
  })

  it('no site inherits the parent NYC-Maid OG card except the tracked-RED baseline', () => {
    const inheriting = sitesInheritingParentOg()

    const untracked = inheriting.filter((s) => !INHERITS_PARENT_OG_BASELINE.has(s))
    expect(
      untracked,
      'A site has no own opengraph-image.tsx and no explicit openGraph/twitter ' +
        '`images` key — it will render the shared NYC-Maid branded social card ' +
        '(see deploy-prep/og-image-coverage-audit.md, C2). Give it its own ' +
        'opengraph-image.tsx, or if intentional add it to INHERITS_PARENT_OG_BASELINE:\n' +
        untracked.map((s) => `  ${s}`).join('\n'),
    ).toEqual([])

    // Tracked-RED flip: a baseline entry no longer inheriting was FIXED (own
    // opengraph-image.tsx added, or an explicit images key set) — remove it.
    const stale = Array.from(INHERITS_PARENT_OG_BASELINE)
      .filter((s) => !inheriting.includes(s))
      .sort()
    expect(
      stale,
      'A tracked-RED inheriting site now has its own OG image (fixed). Delete ' +
        'these stale entries from INHERITS_PARENT_OG_BASELINE in this test:\n' +
        stale.map((s) => `  ${s}`).join('\n'),
    ).toEqual([])
  })
})
