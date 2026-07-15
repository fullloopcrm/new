# OG / Twitter Image Coverage Audit — per tenant site

**Worker:** W3 · **Branch:** p1-w3 · **Date:** 2026-07-12
**Scope:** file-only audit (no code changes). Every fix below is a recommendation
for the leader; nothing here is applied.

## What was checked

For each independent tenant marketing site under `platform/src/app/site/*` (the
22 sites discovered by the same rule the SEO test uses — a site-root
`sitemap.ts`, plus `wash-and-fold-hoboken` and `nyc-classifieds`):

1. **OG image present?** — a site-root `opengraph-image.tsx` (dynamic
   `next/og` route) **or** an explicit `openGraph.images` in metadata pointing
   at a real asset.
2. **Twitter image present?** — a `twitter-image.tsx`, an explicit
   `twitter.images`, or reliance on OG fallback (Next reuses `opengraph-image`
   for the Twitter card when no `twitter-image` exists).
3. **Correct dimensions?** — 1200×630 is the target for
   `summary_large_image`. Flag 512×512 (favicon-as-OG) and any asset whose
   declared size ≠ its real size.
4. **Missing / placeholder / wrong-brand?** — asset file actually exists in
   `public/`; brand shown matches the tenant (not another tenant's brand).

### Method caveat (honest)

- OG/Twitter presence and `images:` values were read from source
  (`layout.tsx` + `page.tsx`) and cross-checked against files in `public/` and
  the site dir. Static-JPG dimensions were read from the file headers
  (`file public/og-*.jpg`).
- The **"inherits parent OG"** finding (Category E) relies on the documented
  Next.js file-convention rule: an `opengraph-image` in a route segment applies
  to every descendant segment that does not define its own, and a child
  `openGraph: {}` object **without** an `images` key does **not** suppress the
  inherited file image. This was **not** confirmed against built `<meta
  property="og:image">` HTML in this pass. **Before remediation, confirm by
  viewing the built page source (or a link-preview debugger) for one affected
  tenant.** I'm flagging the mechanism, not a runtime-observed value.

## Summary scoreboard

| Site | OG source | Dims | Twitter | Verdict |
|------|-----------|------|---------|---------|
| nyc-classifieds | own `opengraph-image.tsx` | 1200×630 | `twitter-image.tsx` (re-exports OG) | ✅ good |
| theroadsidehelper | own `opengraph-image.tsx` | 1200×630 | `twitter-image.tsx` (re-exports OG) | ✅ good |
| the-florida-maid | own `opengraph-image.tsx` | 1200×630 | OG fallback | ✅ good |
| sunnyside-clean-nyc | own `opengraph-image.tsx` | 1200×630 | OG fallback | ✅ good |
| we-pay-you-junk | own `opengraph-image.tsx` | 1200×630 | OG fallback | ✅ good |
| nyc-mobile-salon | own OG + `images:["/opengraph-image"]` | 1200×630 | OG fallback | ✅ good |
| consortium-nyc | `/og-consortium.jpg` (exists) | 1200×630 | same static jpg | ✅ good |
| the-nyc-marketing-company | `/og-marketing.jpg` (exists) | 1200×630 | same static jpg | ✅ good |
| nycroadsideemergencyassistance | own OG route **but** metadata overrides with `["/icon"]` | mismatch | `["/icon"]` | ⚠️ self-sabotage |
| wash-and-fold-nyc | `images:[…/opengraph-image]`, no OG file | **512×512** declared | OG fallback | ❌ broken/wrong dims |
| wash-and-fold-hoboken | `images:[thenycmaid.com/icon-512.png]` | **512×512** | OG fallback | ❌ wrong-brand + wrong dims |
| debt-service-ratio-loan | `/og-image.jpg` | 1200×630 declared | `/og-image.jpg` | ❌ asset MISSING |
| landscaping-in-nyc | `/og-image.jpg` | 1200×630 declared | `/og-image.jpg` | ❌ asset MISSING |
| stretch-ny | `/og-image.jpg` | 1200×630 declared | `/og-image.jpg` | ❌ asset MISSING |
| stretch-service | `/og-image.jpg` | 1200×630 declared | `/og-image.jpg` | ❌ asset MISSING |
| the-nyc-interior-designer | `/og-image.jpg` | 1200×630 declared | `/og-image.jpg` | ❌ asset MISSING |
| nyc-tow | none → inherits parent | n/a | inherits | ❌ wrong-brand (see caveat) |
| toll-trucks-near-me | none → inherits parent | n/a | inherits | ❌ wrong-brand (see caveat) |
| the-nyc-exterminator | none → inherits parent | n/a | inherits | ❌ wrong-brand (see caveat) |
| the-nyc-seo | none → inherits parent | n/a | inherits | ❌ wrong-brand (see caveat) |
| the-home-services-company | none → inherits parent | n/a | inherits | ❌ wrong-brand (see caveat) |
| fla-dumpster-rentals | none → inherits parent | n/a | inherits | ❌ wrong-brand (see caveat) |

8 good · 1 self-sabotage · 13 broken/wrong.

---

## CRITICAL findings

### C1 — `/og-image.jpg` is referenced by 5 sites but does not exist in `public/`

`public/og-image.jpg` is **missing** (`public/` contains only `logo.png`,
`og-consortium.jpg`, `og-marketing.jpg`). These five sites declare it at
1200×630 in both `openGraph.images` and `twitter.images`, so every social
share renders a **blank/broken preview**:

- `src/app/site/debt-service-ratio-loan/layout.tsx:71,83`
- `src/app/site/landscaping-in-nyc/layout.tsx:71,83`
- `src/app/site/stretch-ny/layout.tsx:71,83`
- `src/app/site/stretch-service/layout.tsx:71,83`
- `src/app/site/the-nyc-interior-designer/layout.tsx:70,82`

Second problem even if the file existed: `/og-image.jpg` is a **single shared
`public/` path**, so all five distinct brands (a loan calculator, an NYC
landscaper, two stretch sites, an interior designer) would share **one**
image — wrong-brand for at least four of them.

**Recommended fix:** give each a dynamic `opengraph-image.tsx` (copy the
`the-florida-maid` / `sunnyside-clean-nyc` pattern — brand name, tagline, phone,
brand color) and drop the `/og-image.jpg` references. Cheapest stopgap: add a
real 1200×630 `public/og-image.jpg`, but that only masks the wrong-brand issue.

### C2 — Six sites ship no OG image and inherit the NYC-Maid parent OG

`src/app/site/opengraph-image.tsx` renders **"The NYC Maid — NYC House Cleaning
& Maid Service From $59/hr"** (navy card, cleaning copy). These six sites define
`openGraph: { … }` **without** an `images` key and have **no** own
`opengraph-image.tsx`, so — per the Next file-convention (see method caveat) —
they inherit that NYC-Maid card as their OG/Twitter preview:

- `nyc-tow` — a **towing** service (`layout.tsx:25`)
- `toll-trucks-near-me` — a **towing/dispatch** service (`layout.tsx:25`)
- `the-nyc-exterminator` — **pest control** (`layout.tsx:40`)
- `the-nyc-seo` — an **SEO agency** (`layout.tsx`)
- `the-home-services-company` — generic **home services** (`layout.tsx:25`)
- `fla-dumpster-rentals` — **dumpster rental** (`layout.tsx`)

A tow truck or a dumpster company sharing a maid-service graphic is a
brand-integrity problem on every social share and rich result.

**Recommended fix:** each gets its own `opengraph-image.tsx`. (Confirm the
inheritance against built HTML first — see caveat.)

### C3 — wash-and-fold-hoboken: wrong-brand + wrong-size + cross-domain OG

`src/app/site/wash-and-fold-hoboken/layout.tsx:30-40` sets the OG title to
**"The NYC Maid - Professional Cleaning Services in NYC From $59/hr"** and
`images:[{ url: 'https://www.thenycmaid.com/icon-512.png', width: 512, height:
512 }]` — a Hoboken **laundry** site advertising the NYC Maid brand, using a
**512×512 favicon** (wrong for `summary_large_image`) hosted on **another
tenant's domain**. Looks like an un-rebranded copy of the NYC-Maid template.

**Recommended fix:** rewrite the OG/Twitter title+description for the laundry
brand and give it a 1200×630 `opengraph-image.tsx`.

### C4 — wash-and-fold-nyc: 512×512 OG pointing at a non-existent route

`src/app/site/wash-and-fold-nyc/layout.tsx:33` →
`https://www.washandfoldnyc.com/opengraph-image` declared **512×512**. There is
**no** `opengraph-image.tsx` in that site dir, so `/opengraph-image` is not a
generated route; the URL likely 404s (or falls back to the inherited parent).
The brand title is correct here, but the image is broken and mis-sized.

**Recommended fix:** add a real 1200×630 `opengraph-image.tsx` and set
`images:["/opengraph-image"]` (relative, dimension-less — let Next report the
real size).

---

## MEDIUM findings

### M1 — nycroadsideemergencyassistance overrides its own good OG with a favicon

The site **has** a proper brand OG route
(`opengraph-image.tsx` → `renderBrandOgImage()`), but
`src/app/site/nycroadsideemergencyassistance/layout.tsx:34-47` sets
`openGraph.images:[{ url:"/icon", width:1200, height:630 }]` and
`twitter.images:["/icon"]`. `/icon` resolves to the app favicon (no local
`icon.*` route in the site), which is **not** 1200×630 — so the declared
dimensions are a lie and the good `renderBrandOgImage` output is bypassed.

**Recommended fix:** delete the `images` overrides in both `openGraph` and
`twitter`; let the `opengraph-image.tsx` file convention supply the card.

### M2 — nycmaid flattened subpages use `icon-512.png` (512×512) as OG

Several nycmaid route-segment pages (outside the 22-site set but in the same
tree) declare `icon-512.png` at 512×512 as their OG image, e.g.:

- `src/app/site/available-nyc-maid-jobs/page.tsx:61`
- `src/app/site/nyc-cleaning-service-frequently-asked-questions-in-2025/page.tsx:63`
- `src/app/site/service-areas-served-by-the-nyc-maid/page.tsx:40`

The nycmaid **root** has a correct 1200×630 `opengraph-image.tsx`; these
subpages needlessly downgrade to a square favicon. Lower priority (nycmaid is
already live), but worth normalizing to the root OG on the next pass.

---

## Good — the pattern to copy

`the-florida-maid/opengraph-image.tsx` and `sunnyside-clean-nyc/opengraph-image.tsx`
are the reference implementation: `runtime = 'edge'`, `size = { width: 1200,
height: 630 }`, `contentType = 'image/png'`, brand name + tagline + trust row +
phone on a brand-color card, plus a matching `alt`. `theroadsidehelper` and
`nyc-classifieds` additionally add a `twitter-image.tsx` that re-exports the OG
route — the cleanest way to guarantee the Twitter card matches the OG card.

## Remediation priority

1. **C2** (6 wrong-brand inherited OGs) and **C1** (5 missing-asset OGs) — 11
   live sites with broken or wrong-brand previews. Confirm C2 inheritance
   against built HTML, then author dynamic OG routes.
2. **C3 / C4** (two wash-and-fold sites) — wrong brand / wrong size / broken.
3. **M1** — one-line-per-key deletion, restores an already-built brand OG.
4. **M2** — normalize nycmaid subpage OGs (cosmetic, post-launch).
