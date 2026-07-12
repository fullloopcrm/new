import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// SEO guard — OG / social image ASSET EXISTENCE (W3 SEO sign-off, category §1).
//
// The OG coverage audit (deploy-prep/og-image-coverage-audit.md, finding C1)
// found 5 tenant sites whose openGraph/twitter metadata references
// `/og-image.jpg` — an asset that DOES NOT EXIST in public/. A referenced-but-
// missing OG image renders a BLANK social share preview on every link share.
// That category was SHIP-IN-WAVE but, unlike §2/§3/§4/§5/§6, had NO regression
// guard. This codifies it.
//
// Invariant: every LOCAL image path (`/foo.png`) referenced in a tenant site's
// `layout.tsx` — where OG/Twitter/icon metadata canonically lives — must resolve
// to a real file under public/. A path that 404s is a broken card or icon.
//
// TRACKED-RED convention (matches seo-canonical-consistency.test.ts): the known-
// broken references are frozen in MISSING_ASSET_BASELINE. The guard is GREEN
// today and FLIPS TO FAIL the moment either (a) a NEW site references a missing
// asset — a regression — or (b) one of the tracked references is fixed (asset
// added, or reference removed) — the signal to delete its baseline entry. Fix +
// baseline-entry removal is one atomic change.
//
// SCOPE: layout.tsx only (the canonical metadata home). The same `/og-image.jpg`
// also appears in some sites' `_lib/schema.tsx` JSON-LD `image` and page-level
// clients; those are covered by the OG audit's remediation, not re-derived here.
// Pure source + fs existence — no build, no network. vitest cwd = platform root.

const SITE_ROOT = join(process.cwd(), 'src', 'app', 'site')
const PUBLIC_ROOT = join(process.cwd(), 'public')

// Local absolute image references: `'/foo/bar.png'` / `"/og-image.jpg"`.
const LOCAL_IMAGE_RE = /['"`](\/[A-Za-z0-9._/-]+\.(?:jpg|jpeg|png|webp|avif|gif))['"`]/g

// Known-broken references, frozen. `${site}::${path}`. Each entry is a real
// missing-asset defect awaiting the SEO wave — NOT an assertion that it's fine.
//   • 5× /og-image.jpg  → OG audit C1 (blank OG card; each needs its own
//     opengraph-image.tsx per the florida-maid/sunnyside pattern).
//   • stretch-ny favicon.png + apple-touch-icon.png → broken <link> icons found
//     while writing this guard (root-path refs; public/ has only public/favicons/).
const MISSING_ASSET_BASELINE: ReadonlySet<string> = new Set([
  'debt-service-ratio-loan::/og-image.jpg',
  'landscaping-in-nyc::/og-image.jpg',
  'stretch-ny::/og-image.jpg',
  'stretch-service::/og-image.jpg',
  'the-nyc-interior-designer::/og-image.jpg',
  'stretch-ny::/favicon.png',
  'stretch-ny::/apple-touch-icon.png',
])

function siteLayouts(): Array<{ site: string; file: string }> {
  return readdirSync(SITE_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ site: d.name, file: join(SITE_ROOT, d.name, 'layout.tsx') }))
    .filter((s) => existsSync(s.file))
}

function missingReferences(): string[] {
  const missing = new Set<string>()
  for (const { site, file } of siteLayouts()) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(LOCAL_IMAGE_RE)) {
      const path = m[1]
      if (!existsSync(join(PUBLIC_ROOT, path))) missing.add(`${site}::${path}`)
    }
  }
  return Array.from(missing).sort()
}

describe('SEO — OG/social image asset existence', () => {
  it('finds the site tree and public dir where the guard expects them', () => {
    expect(existsSync(SITE_ROOT), `no site root at ${SITE_ROOT}`).toBe(true)
    expect(existsSync(PUBLIC_ROOT), `no public dir at ${PUBLIC_ROOT}`).toBe(true)
  })

  it('every local image referenced in a site layout resolves in public/ (except tracked-RED)', () => {
    const missing = missingReferences()

    const untracked = missing.filter((m) => !MISSING_ASSET_BASELINE.has(m))
    expect(
      untracked,
      'A site layout references a local image that does NOT exist in public/ — ' +
        'broken OG card or icon (see deploy-prep/og-image-coverage-audit.md).\n' +
        'Add the asset, or if intentional add it to MISSING_ASSET_BASELINE:\n' +
        untracked.map((m) => `  ${m}`).join('\n'),
    ).toEqual([])

    // Tracked-RED flip: a baseline entry that is no longer missing was FIXED —
    // remove it from MISSING_ASSET_BASELINE (this is the intended signal).
    const stale = Array.from(MISSING_ASSET_BASELINE).filter((b) => !missing.includes(b)).sort()
    expect(
      stale,
      'A tracked-RED OG/icon asset is now present (fixed). Delete these stale ' +
        'entries from MISSING_ASSET_BASELINE in this test:\n' +
        stale.map((m) => `  ${m}`).join('\n'),
    ).toEqual([])
  })
})
