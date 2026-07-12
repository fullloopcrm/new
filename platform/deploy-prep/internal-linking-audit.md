# Internal-Linking & Orphan-Page Audit — per tenant site

**Worker:** W3 · **Branch:** p1-w3 · **Date:** 2026-07-12
**Scope:** file-only audit (no code changes). Fixes below are recommendations.

## What was checked

For each of the 22 independent tenant sites under `platform/src/app/site/*`
(site-root `sitemap.ts` + `wash-and-fold-hoboken` + `nyc-classifieds`):

- **Routes** — every static `page.tsx` directory (dynamic `[slug]` routes
  excluded; Next route groups `(app)`/`(marketing)` collapsed to their real URL
  path).
- **Internal links** — every `href="…"` / `href={'…'}` string literal across the
  site's `.ts`/`.tsx`.
- **Orphan** — a static **marketing** route whose URL path (full path or its
  trailing 1–2 segments) appears in **no** internal `href` in the site. Routes
  behind auth (`/book/*`, `/team/*`, `/login`, `/clients/*`, `/apply/<role>`,
  `/dashboard`, `/collect`) are bucketed separately — they are intentionally not
  linked from public nav and are **not** counted as SEO orphans.

### Method caveats (honest — read before acting)

1. **Heuristic, not a crawler.** Matching is by URL-path substring, not a real
   render-time link graph. It can (a) miss an orphan that is linked only via a
   `<Link>` built from a variable/template, and (b) flag a false orphan if a
   page is reachable through a path shape the matcher didn't normalize. **I
   spot-verified every "confirmed" orphan below with a direct `grep` for its
   href; the "candidate" ones I did not individually confirm.**
2. **Homepage noise.** The site root (`/`) surfaces in the raw tool output as
   `/page.tsx`; it is the homepage and is never an orphan — excluded everywhere
   below. A site whose only raw orphan was `/page.tsx` has **effectively full
   internal-link coverage** and is listed as ✅.
3. Coverage % is `(marketing routes − real orphans) / marketing routes`, with
   the homepage excluded from the orphan count.

---

## Sites with full (or effectively full) coverage ✅

No real orphans found (homepage-only noise):

`debt-service-ratio-loan`, `landscaping-in-nyc`, `nyc-classifieds`,
`nyc-mobile-salon`, `nyc-tow`, `nycroadsideemergencyassistance`,
`the-home-services-company`, `theroadsidehelper`, `toll-trucks-near-me`,
`we-pay-you-junk`.

---

## Sites with orphan pages ❌

### the-nyc-seo — 5 orphans (CONFIRMED)

`/businesses/automotive`, `/businesses/events`, `/businesses/lifestyle`,
`/businesses/pet-services`, `/businesses/seasonal`

The site links to **many** `/businesses/*` category pages (beauty-personal-care,
business-services, education, financial, fitness-wellness, food-dining,
health-medical, home-services, legal, …) but **not** these five, even though
their `page.tsx` files exist. The `/businesses` index links a subset only.
**Impact:** 5 category landing pages with zero internal links — near-invisible
to crawlers, no PageRank flow. **Fix:** add them to the `/businesses` index grid
(and any relevant cross-links), or remove the pages if intentionally retired.

### fla-dumpster-rentals — 5 orphans (CONFIRMED)

`/best-dumpster-rental-florida`, `/cheap-dumpster-rental`,
`/same-day-dumpster-rental`, `/contractor-program`, `/free-quote`

`grep` for any href to these returns nothing — they are entirely unlinked. Three
are high-intent SEO landing pages (`best-…`, `cheap-…`, `same-day-…`) and
`/free-quote` is a **conversion** page. **Fix:** link the three landers from the
services/nav area and surface `/free-quote` + `/contractor-program` as primary
CTAs.

### the-nyc-exterminator — 1 orphan (CONFIRMED, high value)

`/schedule-service`

Present in `sitemap.ts:31` and self-canonical in its own `page.tsx`, but **no
internal `href` points to it**. This is the site's **primary conversion route**
sitting orphaned. **Fix:** wire it into the header CTA / nav / hero buttons.

### consortium-nyc — up to 7 orphans (contact/pricing/faq/blog CONFIRMED unlinked)

`/nyc-web-design-pricing`, `/pricing`,
`/contact-nyc-digital-marketing-agency-consortium-nyc`,
`/contact-nyc-marketing-company-consortium-nyc`,
`/nyc-digital-marketing-agency-faqs`,
`/master-marketing-checklist-last-updated-2026`,
`/the-marketing-blog/10-seo-mistakes-nyc-businesses-2026`

`grep` confirms no href to `nyc-web-design-pricing` or `/pricing`. Note **two
separate pricing pages** (`/pricing` and `/nyc-web-design-pricing`) both
unlinked — likely a duplicate that should be consolidated (pick one canonical
pricing URL, 301 or delete the other). Contact and FAQ pages being unlinked is a
notable UX + SEO gap. **Fix:** link pricing/contact/FAQ from nav+footer; resolve
the pricing duplication.

### the-nyc-marketing-company — up to 6 orphans (shares consortium's pages)

`/nyc-web-design-pricing`, `/pricing`,
`/contact-nyc-marketing-company-consortium-nyc`,
`/master-marketing-checklist-last-updated-2026`,
`/the-free-human+ai-seo-marketing-review`,
`/the-marketing-blog/10-seo-mistakes-nyc-businesses-2026`

Same shape as consortium-nyc (these two sites clearly share a template). Same
duplicate-pricing issue. Also note `/the-free-human+ai-seo-marketing-review`
contains a literal `+` in the path — verify it's URL-encoded correctly and
intentionally unlinked. **Fix:** same as consortium.

### stretch-ny and stretch-service — 4 orphans each (blog/careers CONFIRMED)

`/blog`, `/careers`, `/stretching-101/complete-wellness-guide`,
`/stretching-101/tips`

`grep` confirms no href to `/blog` or `/careers`. The two `stretching-101/*`
deep pages are content pages linked from neither the `stretching-101` hub nor
nav (candidate — high confidence given the pattern). `stretch-ny` and
`stretch-service` are near-duplicate sites, so the gap is duplicated. **Fix:**
add `/blog` + `/careers` to the footer; link the `stretching-101` children from
their hub.

### the-florida-maid — 1 real orphan (+ auth routes excluded)

Real orphan: `/careers`. (`/clients`, `/clients/new` are behind the
client-portal auth flow and excluded.) **Fix:** link `/careers` from the footer.

### sunnyside-clean-nyc — 1 orphan

`/frequently-asked-cleaning-service-related-questions`

FAQ page not linked from nav/footer. On an 8-page site this is a large share of
the content graph. **Fix:** add the FAQ to nav+footer (matches how
`the-florida-maid` links its FAQ).

### the-nyc-interior-designer — 1 orphan (candidate)

`/interior-design-101` — content/guide page, not linked. **Fix:** link from
nav/footer or a related-content block.

### wash-and-fold-hoboken / wash-and-fold-nyc — utility routes only

`/unsubscribe` (both) and `/chat-with-selena` (hoboken). These are
transactional/utility pages normally reached by email link or widget, not site
nav — **acceptable to leave unlinked**; listed for completeness, not flagged.

---

## Cross-cutting observations

- **Duplicate pricing pages** on `consortium-nyc` and `the-nyc-marketing-company`
  (`/pricing` + `/nyc-web-design-pricing`) — consolidate to one canonical URL to
  avoid keyword cannibalization and split link equity.
- **Conversion pages orphaned** — `the-nyc-exterminator/schedule-service` and
  `fla-dumpster-rentals/free-quote` are the highest-priority fixes: unlinked
  money pages hurt both SEO and on-site conversion.
- **Template-shared gaps** — the consortium/marketing pair and the stretch pair
  each duplicate the same orphan set, so a single template-level nav/footer fix
  resolves two sites at once.
- **FAQ pages** are a recurring orphan (sunnyside, consortium). A footer "FAQ"
  link is the cheapest systemic fix.

## Remediation priority

1. **Orphaned conversion pages** — `the-nyc-exterminator/schedule-service`,
   `fla-dumpster-rentals/free-quote`.
2. **Orphaned SEO landers** — `the-nyc-seo` 5 business categories,
   `fla-dumpster-rentals` 3 `*-dumpster-rental` pages.
3. **Duplicate pricing consolidation** — consortium + marketing.
4. **FAQ / careers / blog footer links** — sunnyside, florida-maid, stretch
   pair, consortium/marketing.
5. `interior-design-101`, stretch `stretching-101/*` — confirm then link.
