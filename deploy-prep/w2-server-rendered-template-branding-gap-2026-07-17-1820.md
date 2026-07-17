# W2 gap/fluidity refresh — 2026-07-17 18:20 EDT

Leader's fresh 3-deep queue (17:54): (1) start on the 12 server-rendered
template files scoped in the last round's report
(`w2-client-component-placeholder-branding-gap-2026-07-17-1750.md`), own
prioritized list; (2) continue whichever surface (1) opens up; (3) keep
gap/fluidity current.

## (1) Closed this round — server-rendered placeholder branding, 13 files + 1 shared component

Same bug class as every round tonight: `/site/template` pages/lib code
hardcoding the literal "Your Business" / "(555) 555-5555" / "555.555.5555"
/ "hi@example.com" / "example.com" placeholder instead of reading the
tenant's real identity. Worked the leader's 12-file list in priority order
by literal-instance count, but the actual live-bug count came in higher
than the ~118 estimate because (a) the estimate's grep pattern missed a
second phone-literal format (`555.555.5555`, used in `sms:5555555555`
hrefs — separate from the `(555) 555-5555` display-text format it did
catch), and (b) fixing files surfaced a shared component with its own
independent bug, described below.

**Files fixed, in the order worked:**

1. **`page.tsx`** (homepage, was ~24, actually ~29 counting the
   `555.555.5555` format) — `testimonials` and `homepageFAQs` were
   module-level consts with no config access at all; converted both to
   functions taking `SiteConfig`, wired into the one component that renders
   them. ~18 more inline JSX literals (hero/section headers, photo
   alt/caption, 4 fake-review-card quotes, referral CTA) fixed in place
   using `siteConfig.identity.name` / `.contact.phone` / `.contact.email`.
2. **`_lib/seo/photos.ts`** (was ~20) — AUTO-GENERATED photo data file
   ("do not edit by hand"); rather than hand-editing ~20 source strings,
   added a `brand: BrandContext = DEFAULT_BRAND` param to all 3 exported
   pickers (`pickLifestylePhoto`/`pickTeamPhoto`/`pickPhotoByCategory`)
   that rebrands `.alt`/`.caption` at read time — same pattern as
   `content.ts`'s `neighborhoodContent()`. Wired into all 5 real call sites
   (`page.tsx`, `sitemap.xml/route.ts`, `[slug]/page.tsx`,
   `[slug]/[service]/page.tsx`, `services/[slug]/page.tsx`).
3. **`[slug]/page.tsx`** (area + neighborhood pages, was 12) — 9
   `sms:5555555555` hrefs + "Text 555.555.5555" / "Text (555) 555-5555" CTAs
   across both branches, a template-literal "Reach us at (555) 555-5555"
   step description ×2, and 2 photo-figcaption "by Your Business" mentions.
4. **`_lib/seo/content.ts`** (was 11, actually 13 — leader's count missed 2
   phone literals buried in `richContentMap`'s `same-day-cleaning` entry) —
   `neighborhoodServiceContent`, `serviceContent`, `neighborhoodFAQs`,
   `commonServiceFAQs`, and `getServiceRichContent` had no `brand` parameter
   at all (unlike their already-migrated siblings
   `homepageContent`/`areaContent`/`neighborhoodContent`). Added
   `brand: BrandContext = DEFAULT_BRAND` to all 5 (the rich-content one via
   a JSON-stringify/replace pass over the static map entry, since that data
   is a plain object literal, not a template function). Wired into every
   call site (`[slug]/page.tsx`, `[slug]/[service]/page.tsx`,
   `services/[slug]/page.tsx`).
5. **`services/[slug]/page.tsx`** (was 6, actually 8) — same
   sms/text-CTA + figcaption pattern as `[slug]/page.tsx`, plus wiring the
   3 content.ts functions above.
6. **`service-areas/page.tsx`** (was 5) — `areaFAQs` module-level const
   (had 2 phone + 1 "Your Business" literal) converted to a function taking
   `{name, phone}`; 2 more CTA text instances fixed directly.
7. **`service/nyc-emergency-cleaning-service/page.tsx`** (was 4) — same
   pattern: `process` module-level const (1 phone literal) converted to a
   function taking `phone`; 3 more CTA text instances.
8. **`careers/operations-coordinator/page.tsx`** (was 3) — `faqs`
   module-level const's "How do I apply?" answer hardcoded
   `example.com/apply/operations-coordinator`; converted to a function
   taking `url`. 1 "Your Business" header line + 2 CTA text instances fixed
   directly.
9. **`[slug]/[service]/page.tsx`** (was 3, actually 6) — same
   sms/text-CTA pattern, plus wiring `neighborhoodServiceContent`/
   `neighborhoodFAQs`/`commonServiceFAQs`.
10. **`sitemap.xml/route.ts`** — not in the original 12 (it's the XML
    sitemap route, not a page), but it imports the same `_lib/seo/photos.ts`
    pickers for `<image:title>`/`<image:caption>` on every area/service/
    neighborhood/blog-post `<url>` entry — real Google Image Search surface.
    Wired `brand` through all 7 picker calls once the photos.ts infra fix
    landed.

**New fresh-ground find — `_components/CTABlock.tsx` (shared, not one of
the 12 files):** hardcoded `href="sms:5555555555"` / "Text 555.555.5555" —
found because the homepage's own render test (below) rendered the real
`<CTABlock>` and caught text the file-level grep never would have (the grep
scope was the 12 *page* files; this bug lived in a shared `_components/`
file rendered *by* 9 of them). Added required `phone`/`phoneDigits` props;
wired all 9 call sites (`page.tsx`, `[slug]/page.tsx` ×2,
`get-paid-for-cleaning-referrals-.../page.tsx`, `service-areas/page.tsx`,
`reviews/page.tsx`, `[slug]/[service]/page.tsx`,
`service/nyc-emergency-cleaning-service/page.tsx`, `services/[slug]/page.tsx`).
This one component fix closed the same literal bug on 2 pages that were
never in the original 12-file scope (`get-paid-for-cleaning-referrals...`
and `reviews/page.tsx`) for free.

**Verification:** `npx tsc --noEmit` clean (full project). Full suite:
649/649 test files (645+4), 2781/2818 tests passed (2761+20), 37
pre-existing skips (unchanged), 0 failures. 20 new tests across 4 new
files: `page.homepage-branding.test.tsx` (5,
includes a full-render smoke test that's what caught the CTABlock bug and a
wrong-tenant probe), `[slug]/page.branding.test.tsx` (3, area + neighborhood
branches + wrong-tenant probe), `_lib/seo/content.branding.test.ts` (9,
covers all 5 newly-parameterized functions + 2 wrong-tenant probes),
`_lib/seo/photos.branding.test.ts` (3, sweeps 50+ seeds since pickers are
hash-based). `npx eslint` on all 13 touched + 4 new test files: 0 errors,
10 warnings, all 10 confirmed pre-existing via `git show HEAD:<file>` diff
(unused imports/params untouched by this round's edits) except 2 expected
`no-img-element` warnings in the new test files' own `next/image` mocks.

## (2) Investigated and confirmed NOT a live bug — `_lib/seo/blog-data.ts` (was counted as 26)

The leader's count treated this as the largest single-file item. Traced
every consumer: `BLOG_POSTS`' `metaDescription`/`sections` fields (where
all 26 "Your Business (555) 555-5555" literals live) are **never read by
any rendered page** — the actual `/blog` and `/blog/[slug]` routes import a
*different*, already-fully-brand-threaded `blogPosts(config)` from
`_lib/content/longform.ts` (confirmed via the file's own doc comment: "The
old content.ts is cleaning-authored end to end... This module is its
de-cleaned successor"). The only consumer of `_lib/seo/blog-data.ts` is
`sitemap.xml/route.ts`, and it only touches `.slug`/`.date`/`.title` (title
strings contain no placeholder). `getBlogPost`/`getAllBlogSlugs` (also
exported from this file) have zero callers anywhere in the app. This
matches the same dead-code pattern as `HeroChat.tsx` flagged last round —
confirmed via full repo-wide grep for both the import path and the two
named exports, not just an assumption. Not fixed (no live effect); leaving
the file as-is rather than editing 26 lines of literally-unreachable data.

## NOTICED — not fixed, flagging for the leader/Jeff

1. **`_components/CTABlock.tsx`'s "Write a Review" link** hardcodes
   `https://g.page/r/CSX9IqciUG9SEAE/review` (nycmaid's own Google Business
   review link) — now confirmed present on all 9 pages that render
   `<CTABlock>`, not just the 2 instances (homepage, `reviews/page.tsx`)
   flagged last round. Same open question as last round: does
   `tenant.google_place_id` exist / is there a helper to build a per-tenant
   review URL from it? Needs its own investigation before touching.
2. **`careers/operations-coordinator/page.tsx` is nycmaid-specific
   business content, not generic template content** (new finding, larger
   than a branding gap). The FAQ answers and JobPosting JSON-LD reference
   specific real figures ("February we did 36 services. March we did
   81... $1,700", "aiming for 100 services/week... $8,000/month"), name
   "Jeff" as the owner by name in multiple places, and link to nycmaid's
   own Google review URL — none of that is tenant-resolved, all of it
   would render verbatim and wrong for every other template tenant with
   this careers page enabled. This is a content-applicability bug, not a
   placeholder-branding bug — flagging rather than scoping a fix blind.
3. **`careers/operations-coordinator/page.tsx` links to
   `/apply/operations-coordinator`** (3 places, including the JSON-LD
   `description` and both CTAs) but that route does not exist — only
   `/apply` exists under `/site/template`, with no `[role]` segment. Fixed
   the domain placeholder on this link (now uses the real `biz.url`) but
   left the path alone since inventing a route is out of scope for a
   branding-placeholder pass; the link is a 404 regardless of domain.
4. Carried forward unchanged from prior rounds' lists (items 1-21, plus
   the reviews-surface avatar-initial "M" hardcode and
   `SiteConfig.identity.foundedYear` missing-DB-source items noted last
   round).

## MISSING-FEATURE GAPS

Carried forward from prior rounds' list, items 1-26, unchanged.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker. 13 code files + 1
shared component changed, 4 new test files, not yet committed as of this
writing (committing immediately after this doc).
