# Full Loop CRM — Get Back To Top Checklist

Audience: **tenants · investors · buyers**. Goal: homepage leads "home service crm," domain recovers, asset stays clean for diligence.

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

> Working checklist from the 2026-06-23 review (GSC + code). Not every page deep-read yet (features/about/FAQ/partner/blog still to scan). Will grow.

## P0 — Integrity / risk (protects the asset for buyers)
- [ ] Remove fabricated `AggregateRating` from tenant sites
  - `nyc-mobile-salon` — `reviewCount: "5000"` (from a "5k" marketing stat) — 2 files: `_lib/seo.ts`, `reviews/page.tsx`
  - `the-nyc-seo` — 5.0★ / 4
  - `the-nyc-marketing-company` — 4.9★ / 47
  - Replace with each tenant's **real** `google_review_count` (already tracked in admin), or remove where there are no real reviews.
- [ ] Build **pre-live review system** — real beta-tester reviews → `reviews` table (rating, author, date, verified) → drives real `AggregateRating` on Full Loop **SoftwareApplication** (platform reviews go on the platform entity, NOT salon LocalBusiness). Render reviews on-page for humans too.

## P1 — Recovery / SEO (get back to top)
- [ ] Monitor GSC re-crawl of restored pages (~early–mid July); resubmit sitemap in GSC
- [ ] Fix schema types on main site: drop misapplied `LocalBusiness`, keep `SoftwareApplication` + `Organization` + `FAQPage`
- [ ] Fix broken internal links: "Pricing"/"FAQ" footer links point to `/contact` on location + industry templates → real pages
- [ ] Thicken **location pages** (401) — use unused per-city `population` + `description` data; add FAQ schema
- [ ] Verify industry-content coverage — which of 51 industries fall through `content &&` to thin pages

## P2 — NYC Maid as live proof (tenants/investors/buyers)
- [ ] Wire case study + homepage proof sections to **live NYC Maid prod data** — read-only cached aggregates on a schedule (NOT bulk live reads — see the 6/07 corruption rule). Replace "Live as of April 27" with auto-updating numbers + live timestamp.
- [ ] Add NYC Maid's **real** 4.9★ / 45 reviews as legit `AggregateRating` where attributable

## P3 — Polish / consistency
- [ ] Unify design — cream/ink editorial brand across location/industry/combo/case-study pages (currently old slate/teal/yellow theme = looks like a different company)
- [ ] Add real `Offer` pricing schema ($1,000/user) + state one-tenant-per-category-per-area exclusivity in Org/Service copy
- [ ] Clean dead markup (empty `<p>`/CTA divs) + copy typos ("the Our AI receptionist")
