# OG-Image Fix Plan — tenant sites inheriting the NYC-Maid parent OG

**Status: SPEC ONLY — do NOT apply. Ready-to-apply per-site fixes below.**
Author: W3 · Date: 2026-07-12 · Scope: `platform/src/app/site/*`

---

## TL;DR

**11 bespoke tenant sites** ship a wrong Open Graph image. Two failure modes:

- **Bucket A (6 sites)** set `openGraph` metadata with **no `images`**, so they inherit the
  ancestor file `src/app/site/opengraph-image.tsx` — which renders **"The NYC Maid"**
  branding. Every share/preview of these sites shows a maid-service card.
- **Bucket B (5 sites)** point `openGraph.images` at **`/og-image.jpg`, which does not exist**
  in `public/`. The preview is a broken/empty image (and, depending on Next's file-vs-config
  precedence, may fall through to the same NYC-Maid ancestor card — see caveat).

Two other sites that *look* similar are **actually fine** (their referenced asset exists):
`the-nyc-marketing-company` → `public/og-marketing.jpg` ✓, `consortium-nyc` → `public/og-consortium.jpg` ✓.

> Provenance note: this list was rebuilt from scratch this session (I had no prior notes to
> trust). The count of 11 is derived from the evidence table below, not carried over.

---

## How OG resolution works here (the mechanism)

`src/app/site/opengraph-image.tsx` is a **file-convention** OG image at the `/site` segment. In
the App Router, a metadata image file is **inherited by every descendant segment** that does not
provide its own. That file renders a hard-coded **"The NYC Maid — NYC House Cleaning …"** card:

```
src/app/site/opengraph-image.tsx   →  alt: "The NYC Maid — NYC House Cleaning & Maid Service From $59/hr"
                                       backgroundColor #1E2A4A, "The NYC Maid", "(212) 202-9030"
```

So any `src/app/site/<slug>/` that has **neither** its own `opengraph-image.*` file **nor** a valid
`openGraph.images` entry inherits that NYC-Maid card. That is the bug class.

Working sites already follow the correct pattern — a per-brand `opengraph-image.tsx` in their own
folder (e.g. `the-florida-maid`, `nycmaid`, `sunnyside-clean-nyc`, `nyc-mobile-salon`,
`we-pay-you-junk`, `nycroadsideemergencyassistance`, `theroadsidehelper`, the two wash-and-fold
`(marketing)` groups). The fix below makes the 11 broken sites match that pattern.

---

## Evidence table (verified this session)

Bespoke sites = the 22 entries in `BESPOKE_SITE_TENANTS` (src/middleware.ts). Only distinct
tenant sites are in scope — NYC-Maid's own subpages (`/site/apply`, `/site/reviews`, …) inherit
the NYC-Maid card *correctly*, so they are excluded.

| # | Site (slug) | Own `opengraph-image.*`? | `openGraph.images` in metadata | Asset exists? | Verdict |
|---|---|---|---|---|---|
| — | nycmaid | ✅ yes | — | — | OK (is NYC Maid) |
| — | the-florida-maid | ✅ yes | — | — | OK |
| — | nyc-mobile-salon | ✅ yes | — | — | OK |
| — | we-pay-you-junk | ✅ yes | — | — | OK |
| — | sunnyside-clean-nyc | ✅ yes | — | — | OK |
| — | nycroadsideemergencyassistance | ✅ yes | — | — | OK |
| — | theroadsidehelper | ✅ yes | — | — | OK |
| — | wash-and-fold-nyc | ✅ yes `(marketing)` | — | — | OK |
| — | wash-and-fold-hoboken | ✅ yes `(marketing)` | — | — | OK |
| — | the-nyc-marketing-company | ❌ no | `/og-marketing.jpg` | ✅ **exists** | OK |
| — | consortium-nyc | ❌ no | `/og-consortium.jpg` | ✅ **exists** | OK |
| **A1** | **the-nyc-exterminator** | ❌ no | none | — | **BROKEN → NYC-Maid card** |
| **A2** | **nyc-tow** (The NYC Towing Service) | ❌ no | none | — | **BROKEN → NYC-Maid card** |
| **A3** | **fla-dumpster-rentals** | ❌ no | none | — | **BROKEN → NYC-Maid card** |
| **A4** | **the-home-services-company** | ❌ no | none | — | **BROKEN → NYC-Maid card** |
| **A5** | **the-nyc-seo** | ❌ no | none | — | **BROKEN → NYC-Maid card** |
| **A6** | **toll-trucks-near-me** ⚠ | ❌ no | none | — | **BROKEN → NYC-Maid card** (⚠ phantom orphan) |
| **B1** | **landscaping-in-nyc** | ❌ no | `/og-image.jpg` | ❌ **MISSING** | **BROKEN → 404 image** |
| **B2** | **debt-service-ratio-loan** | ❌ no | `/og-image.jpg` | ❌ **MISSING** | **BROKEN → 404 image** |
| **B3** | **stretch-ny** | ❌ no | `/og-image.jpg` | ❌ **MISSING** | **BROKEN → 404 image** |
| **B4** | **stretch-service** | ❌ no | `/og-image.jpg` | ❌ **MISSING** | **BROKEN → 404 image** |
| **B5** | **the-nyc-interior-designer** | ❌ no | `/og-image.jpg` | ❌ **MISSING** | **BROKEN → 404 image** |

**Total broken: 11** (6 Bucket A + 5 Bucket B).

### ⚠ toll-trucks-near-me caveat
`toll-trucks-near-me` is in `BESPOKE_SITE_TENANTS` **but has no `tenants` row** — it is one of the
two `KNOWN_PENDING_ORPHANS` in the reconcile gate (awaiting Jeff's disposition: delete the
middleware entry + guard slug, or recreate the tenant). Its `/site/toll-trucks-near-me/page.tsx`
still renders if hit directly, so the OG bug is real, but **do not fix the OG until the orphan is
dispositioned** — if the entry is being deleted, the OG file would be deleted with it. Fix it only
if Jeff decides to keep the site.

### Caveat on Bucket B mechanism (honest uncertainty)
Bucket B sites set config `openGraph.images: ["/og-image.jpg"]`. Whether Next.js serves a broken
`/og-image.jpg` (404) **or** falls through to the ancestor **file** OG (NYC-Maid) depends on the
file-convention-vs-config precedence across segments, which I did **not** verify at runtime. Either
way the result is broken, and the recommended fix (a per-brand `opengraph-image.tsx` in the site's
own folder) is the nearest-ancestor file and wins unambiguously — so it moots the question. Verify
with the probe in the "Verification" section after applying.

---

## Recommended fix (all 11): per-brand `opengraph-image.tsx`

Preferred for **every** broken site — it is the pattern the 9 working bespoke sites already use, it
is per-brand-correct, and it does not depend on a shared static asset. A single shared
`public/og-image.jpg` would be **wrong** anyway: Bucket B's five sites are five different businesses
(landscaping, a DSCR-loan guide, two stretch/mobility brands, an interior designer), and each
bespoke tenant is served at its own domain, so `/og-image.jpg` resolves to the *same* shared public
file for all of them.

### The template to port (verified working — `the-florida-maid/opengraph-image.tsx`)

Create `platform/src/app/site/<slug>/opengraph-image.tsx` with this shape, filling the per-site
fields from the table below:

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = '<ALT — e.g. "The NYC Exterminator — NYC Pest Control From $X">'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '<BG_HEX>', padding: '60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: '0.02em', marginBottom: 16 }}>&lt;BRAND&gt;</div>
          <div style={{ fontSize: 36, color: '<ACCENT_HEX>', fontWeight: 600, marginBottom: 32 }}>&lt;SUBTITLE&gt;</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
            <span>&lt;STAT 1&gt;</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>&lt;STAT 2&gt;</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>&lt;STAT 3&gt;</span>
          </div>
          <div style={{ fontSize: 28, color: '<ACCENT_HEX>', marginTop: 40, fontWeight: 600, letterSpacing: '0.1em' }}>&lt;PHONE&gt;</div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>&lt;SERVICE-AREA FOOTER&gt;</div>
      </div>
    ),
    { ...size }
  )
}
```

Notes:
- `runtime = 'edge'` matches the existing OG files; keep it.
- No metadata change is needed — the file convention auto-populates `openGraph.images` and
  `twitter.images` for the whole site subtree, overriding the NYC-Maid ancestor.
- For Bucket B, **also delete** the now-dead `images: ["/og-image.jpg"]` line from that site's
  `layout.tsx` `openGraph` block (≈ line 83; line 82 for `the-nyc-interior-designer`) so there is a
  single source of truth. (Alternatively, leave it — the file convention takes over — but removing
  the dangling missing-asset reference is cleaner.)

### Per-site fill values (verified copy; colors to confirm at apply-time)

Brand name / subtitle / phone are pulled from each site's existing `layout.tsx` metadata and
homepage `tel:` links. **Background/accent hex**: use each site's real brand color — I verified two
(below); for the rest, source from the site's `viewport.themeColor` or its homepage hero at apply
time rather than guessing. Do **not** ship an invented palette.

| Ref | Slug | BRAND | SUBTITLE | PHONE | BG_HEX (verified?) |
|---|---|---|---|---|---|
| A1 | the-nyc-exterminator | The NYC Exterminator | NYC Pest Control · Self-Book & Save $10 | (from homepage) | `#0A0A0A` ✅ |
| A2 | nyc-tow | The NYC Towing Service | 24/7 Towing & Roadside · All 5 Boroughs | (212) 470-4068 | confirm at apply |
| A3 | fla-dumpster-rentals | Florida Dumpster Rentals | Roll-Off Dumpster Rental | (from homepage) | confirm at apply |
| A4 | the-home-services-company | Home Services Co | 40 Home Services from $99/hr · 990 Cities | (888) 700-4001 | `#15803D` ✅ |
| A5 | the-nyc-seo | The NYC SEO | NYC SEO Agency for Local Businesses | (from homepage) | confirm at apply |
| A6 ⚠ | toll-trucks-near-me | Toll Trucks Near Me | 24/7 Tow Truck Dispatch · 30-Min Arrival | (888) 831-3001 | confirm — **orphan, hold** |
| B1 | landscaping-in-nyc | NYC Landscaping | Professional Landscaping in NYC | (212) 470-9637 | confirm at apply |
| B2 | debt-service-ratio-loan | DSCR Loans | Debt Service Coverage Ratio Loan Guide | (855) 300-3727 | confirm at apply |
| B3 | stretch-ny | Stretch NY | Assisted Stretch Service NYC · $99/hr Mobile | (from homepage) | confirm at apply |
| B4 | stretch-service | Stretch Service | Assisted Stretch Service USA · $99/hr Mobile | (from homepage) | confirm at apply |
| B5 | the-nyc-interior-designer | NYC Interior Designer | Professional Interior Design in NYC | (917) 473-2013 | confirm at apply |

STAT 1/2/3 and the service-area footer: lift 2–3 real proof points and the coverage line from each
site's homepage hero (e.g. "Licensed & Insured", "Same-Day", star rating, city list). Keep them
truthful to that site's existing copy — do not invent claims.

### Fully worked example — A1 `the-nyc-exterminator` (drop-in, verify color/stats)

`platform/src/app/site/the-nyc-exterminator/opengraph-image.tsx`

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'The NYC Exterminator — NYC Pest Control · Self-Book & Save $10'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#0A0A0A', padding: '60px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ fontSize: 80, fontWeight: 800, color: 'white', letterSpacing: '0.02em', marginBottom: 16 }}>The NYC Exterminator</div>
          <div style={{ fontSize: 36, color: '#4ADE80', fontWeight: 600, marginBottom: 32 }}>NYC Pest Control · Self-Book &amp; Save $10</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>
            <span>Licensed &amp; Insured</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>Same-Day Slots</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span>Self-Book Online</span>
          </div>
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em' }}>MANHATTAN · BROOKLYN · QUEENS · BRONX · STATEN ISLAND</div>
      </div>
    ),
    { ...size }
  )
}
```

> `#4ADE80` accent above is a placeholder chosen to read on `#0A0A0A` — swap for the site's real
> accent. The "Same-Day / Self-Book" stats and borough footer must be confirmed against the live
> homepage copy before applying.

---

## Alternative for Bucket B only (lighter, if brand imagery already exists)

If real branded 1200×630 images already exist for the Bucket B five, you may instead:
1. Add `public/og-<slug>.jpg` per site (NOT a single shared `/og-image.jpg` — see above).
2. Point each `layout.tsx` `openGraph.images` (and `twitter.images`) at its own `/og-<slug>.jpg`.

This mirrors what `the-nyc-marketing-company` (`/og-marketing.jpg`) and `consortium-nyc`
(`/og-consortium.jpg`) already do correctly. The dynamic `opengraph-image.tsx` route is still
preferred for consistency with the rest of the fleet.

**Do not** simply create one `public/og-image.jpg` to satisfy the five dangling references — it
would brand five different businesses identically.

---

## Verification (run after applying — not part of this spec)

Per fixed site, from `platform/`:

1. **Build sees the route:** `npx next build` then confirm an `opengraph-image` entry is emitted for
   `/site/<slug>` (or `curl -sI` the dev server route below returns `200 image/png`).
2. **Dev probe:** `npm run dev`, then
   `curl -sI http://localhost:3000/site/<slug>/opengraph-image` → expect `200` + `content-type: image/png`.
3. **Metadata probe (confirms it stops inheriting NYC-Maid):**
   `curl -s http://localhost:3000/site/<slug> | grep -i 'og:image'` → the URL should contain
   `/site/<slug>/opengraph-image`, **not** the `/site` ancestor image, and the alt text must be the
   site's own — not "The NYC Maid …".
4. **Bucket B extra:** confirm no remaining reference to the missing `/og-image.jpg`
   (`grep -rn "/og-image.jpg" src/app/site/<slug>`), and that `public/og-image.jpg` is either
   created intentionally or left absent because the dynamic route replaced it.
5. **Regression:** `npx tsc --noEmit` and `npx vitest run` stay green.

---

## Out of scope / notes

- Does not touch NYC-Maid's own subpages — they inherit the NYC-Maid card correctly.
- Does not change `the-nyc-marketing-company` or `consortium-nyc` (verified fine).
- `toll-trucks-near-me` is on hold pending Jeff's orphan disposition (see caveat).
- This document is a spec. **No files were created or edited by it.**
```
