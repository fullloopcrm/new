# W2 gap/fluidity refresh — 2026-07-17 17:04 EDT

Continuation of the ~19-page follow-up flagged at 16:33
(`w2-seo-overrides-apply-layer-single-reader-gap-2026-07-17-1633.md`). Two
distinct, independently-tracked bug classes on `site/template/*`
`generateMetadata()`s: (A) hardcoded "Your Business" / example.com literals
never consulting the tenant's resolved siteConfig at all, and (B) the
seo_overrides apply-layer never being consulted. Both closed for a further
slice this round.

## Closed this round

**(A) toBrand/getSiteConfig wiring — surveyed all 26 metadata exports under
`site/template`, closed the last 6.** `[slug]/[service]/page.tsx` and
`services/[slug]/page.tsx` (the two other highest-cardinality combo page
types, mirrors of `[slug]/page.tsx`'s prior fix) — commit `cae44ff1`. Then
found the actual remaining surface was narrower than assumed: 20 of the 22
"unwired" hits from grep were already correctly calling `getSiteConfig()`
(directly or via a `*Content()` helper) and needed no change — only 4 pages
used `export const metadata`, a compile-time literal that can never resolve
per-tenant no matter how correct `getSiteConfig()` itself is. Two of those
four (`nyc-emergency-cleaning-service`, `reviews/submit`) hardcoded an
**absolute** canonical/OG url (`https://www.example.com/...`), which is
worse than a relative literal — Next.js only rewrites *relative* urls
against the template layout's per-tenant `metadataBase`, so these reported
the identical wrong canonical domain to search engines for every tenant
regardless of that layout-level fix. Converted all 4 to `generateMetadata()`
threading `toBrand()`/`config.identity.name` — commit `0b1d184d`. Also swept
the two other request-time surfaces adjacent to metadata
(`opengraph-image.tsx`, already clean; `sitemap.xml/route.ts`, had one
leftover "Your Business" in the homepage logo's `image:title`) — commit
`7260b340`. 16 new tests total across these, incl. wrong-tenant probes.

**(B) seo_overrides apply-layer — wired into the 3 highest-cardinality page
types.** `[slug]/page.tsx` (both area and neighborhood branches),
`[slug]/[service]/page.tsx`, `services/[slug]/page.tsx` now consult
`getSeoOverride(url)` the same way the homepage does (752299e2), so an
admin-approved or autopilot-applied title/meta fix on these pages actually
reaches the live page instead of silently no-op'ing. 10 new
`page.seo-override-guard.test.ts` tests (naming/shape matching the
homepage's own probe) incl. wrong-tenant probes.

tsc clean at every step. Full suite currently 614/614 files, 2677/2714
tests, 37 pre-existing skips, 0 failures. 0 new eslint warnings (4
pre-existing unused-var warnings in the `[slug]` family, predate this
session, unrelated to these changes).

## NOT fixed this round — tracked follow-up, same shape

**(A) toBrand wiring: DONE for all 26 site/template metadata exports.** No
further template-page work in this bug class. One adjacent item noticed but
deliberately not touched: `_lib/seo/photos.ts`'s photo alt/caption DATA has
~20 "Your Business" mentions baked into static English copy (e.g.
"Professional cleaner from Your Business in red uniform..."). These render
as real `<img alt>` text and also flow into the sitemap's per-photo
`image:title`/`caption` fields, so technically visible to Google Images —
but it's body/caption prose, not a resolver call site, same L2
out-of-scope class the FAQ answers and CTA copy already sit in per
`brand.ts`'s own documented boundary (price/industry-specific wording
deferred to the per-tenant content-generation pass). Flagging, not fixing.

**(B) seo_overrides wiring: 3 of ~19 done.** Still open: services index,
about, contact, faq, pricing, careers (+ its `operations-coordinator` job
posting), blog index + posts, reviews (+ submit), referral-program, legal
pages (privacy/terms/refund/do-not-share), virtual-assistant + its geo/
service hub pages, get-paid-for-referrals, service-areas,
nyc-emergency-cleaning-service. Each needs its own canonical-url
construction checked against exactly what `remediate.ts`/`enrich.ts` store
as `target_url` for that page type before wiring the override check in —
same discipline as last round, not rushed across all of them at once.

**Also confirmed out of scope, correctly:** the ~35 bespoke non-template
tenant sites under `site/<tenant>/*` (wash-and-fold-nyc, the-florida-maid,
stretch-service, etc.) don't call the shared `getSiteConfig()`/tenant-header
resolver at all — each is a standalone single-tenant codebase that already
hardcodes its own real business's identity, not a placeholder. Per
`platform/CLAUDE.md`'s architecture rule, these are known debt slated for
cutover to the global dashboard, not surfaces to extend. Neither this
session's toBrand fix nor the seo_overrides fix applies to them; no action
taken.

File-only. No push/deploy/DB.
