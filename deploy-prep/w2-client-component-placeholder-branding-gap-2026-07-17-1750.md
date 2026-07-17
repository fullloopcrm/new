# W2 gap/fluidity refresh — 2026-07-17 17:50 EDT

Leader's fresh 3-deep queue this round (17:27): (1) new fresh-ground surface,
(2) continue whichever surface (1) opens up, (3) keep gap/fluidity current.
The seo_overrides apply-layer thread closed for real at 17:30
(`w2-seo-overrides-remaining-24-pages-gap-2026-07-17-1730.md`), and the
domain-resolver-precedence thread has been re-audited clean multiple times
today. This round picked up the one item that same 17:30 report explicitly
flagged as NOT fixed and a different mechanism from the 24 pages it closed:
`referral/page.tsx`'s hardcoded placeholder branding — and (2) pursuing that
surface further turned up a much larger sibling bug class across the same
shared template.

## (1) Closed this round — client-rendered pages, 6 files

**Every `'use client'` page/component under `/site/template` — rendered for
every non-bespoke tenant — that shows a real end user (referrer, job
applicant, reviewer, feedback submitter, or booking customer) a per-tenant
identity value hardcoded the literal placeholder "Your Business" /
"(555) 555-5555" / "hi@example.com" instead of reading it from props or a
client-safe tenant fetch.** Same *class* of bug as the rest of this lane's
work, different *mechanism* from the SEO metadata pipeline: these are client
components with no `generateMetadata`, so `getSiteConfig()` never touches
them — branding is set via `document.title` in `useEffect` and inline JSX
driven by component state/props.

- **`referral/page.tsx`** (root cause + `GET /api/referrers/[code]`): API
  route now returns `tenant.email` (same precedence as the template's own
  `contact.email`); page reads `data.tenant` (previously discarded) for
  `document.title`, the dashboard header, and the footer contact line.
- **`apply/ApplyForm.tsx`**: `businessName` was ALREADY correctly threaded
  from `apply/page.tsx`'s `getSiteConfig()` call (used in the header + SMS
  consent copy) — only the "Questions? (555) 555-5555" footer line (2
  occurrences, main form + post-submit confirmation) was missed. Added a
  `phone` prop, wired from `config.contact.phone`.
- **`reviews/ReviewsList.tsx`**: widget header hardcoded "Your Business
  Reviews" with no prop at all in either of `reviews/page.tsx`'s two render
  branches (cleaning / non-cleaning). Added a `businessName` prop.
- **`reviews/submit/ReviewForm.tsx`**: header + submit-confirmation copy
  hardcoded "Your Business" with no prop at all. Added a `businessName` prop,
  sourced from `buildBusiness(config).name` (already computed in
  `reviews/submit/page.tsx` for JSON-LD).
- **`feedback/page.tsx`**: `document.title` hardcoded "...| Your Business".
  Fixed by porting the EXACT pattern already live on the sibling
  `site/feedback/page.tsx` (client-side `GET /api/tenant/public` fetch) —
  that file had already been fixed at some point; the `/site/template` copy
  had not.
- **`book/new/BookFormClient.tsx`** (the highest-traffic page on every
  template tenant's site — the primary booking form): `businessName` was
  already correctly threaded and used in the SMS-consent copy, but
  `document.title` and the "Self-Booking System" badge still hardcoded "Your
  Business", and FIVE separate error/help messages (`sameDay` unavailable
  notice, network-error retry, waitlist-add failure, and the persistent
  bottom-of-form "text us at (555) 555-5555" with `href="sms:5555555555"`)
  hardcoded the fake phone/SMS number — a customer clicking that link would
  have texted a non-existent number. Added `phone`/`phoneDigits` props,
  wired from `config.contact.phone`/`phoneDigits` in `book/new/page.tsx`.
  Also fixed a "Save this — log in at example.com/book" confirmation-screen
  label (the underlying `<Link>` was already correctly relative/functional;
  only the displayed text was a fake domain) to show the real
  `window.location.host`.

12 new tests total (3 for the referral API's email precedence, 3 for the
referral page's tenant rendering + no-email fallback + wrong-tenant probe,
1 for ApplyForm, 1 for ReviewsList, 1 for ReviewForm, 2 for feedback's
document.title including a fetch-failure fallback, 1 smoke test for
BookFormClient covering title/badge/SMS-link + placeholder absence).
tsc clean. 0 new eslint errors (confirmed pre-existing warnings on touched
files are unrelated to these changes, verified via `git stash` diff before
editing). Full suite: 645/645 files (638+7), 2761/2798 tests passed
(2749+12), 37 pre-existing skips (unchanged), 0 failures.

## (2) Fresh-ground opened up — a MUCH larger sibling instance, NOT fixed, flagging with an exact scope

Grepping `/site/template` for the same three literal strings (excluding the
6 files above, the dead `HeroChat.tsx` noted below, and 2 genuine false
positives where "your business" is ordinary English copy addressing the
reader, not a tenant-name placeholder — `_components/VirtualAssistantLanding.tsx`
and `_data/va-home-guide.ts`) turns up **~118 more literal occurrences across
12 SERVER-rendered files**:

| File | Count |
|---|---|
| `_lib/seo/blog-data.ts` | 26 |
| `page.tsx` (homepage) | 24 |
| `_lib/seo/photos.ts` | 20 |
| `[slug]/page.tsx` (area/neighborhood) | 12 |
| `_lib/seo/content.ts` | 11 |
| `services/[slug]/page.tsx` | 6 |
| `service-areas/page.tsx` | 5 |
| `service/nyc-emergency-cleaning-service/page.tsx` | 4 |
| `_lib/seo/brand.ts` | 4 (see below — mostly the intentional default) |
| `careers/operations-coordinator/page.tsx` | 3 |
| `[slug]/[service]/page.tsx` | 3 |

**Important context, not a fresh discovery of unknown debt:** `_lib/seo/brand.ts`
already defines a `BrandContext`/`toBrand()` migration path specifically for
this, with its own doc comment: *"Every content/schema function takes an
optional `brand` and falls back to the neutral default, so a call site that
hasn't been threaded yet still compiles and renders (just with the
placeholder), making the migration incremental."* This is a known,
partially-complete, intentionally-incremental migration, not undiscovered
debt. Checked its actual state:
- `content.ts`'s `homepageContent()` / `areaContent()` / `neighborhoodContent()`
  already accept `brand: BrandContext` and `page.tsx` already calls them via
  `homepageContent(toBrand(siteConfig))` — correctly migrated.
- `content.ts`'s `neighborhoodServiceContent()`, `serviceContent()`,
  `neighborhoodFAQs()`, `serviceFAQs()`, `commonServiceFAQs()` have **no
  brand parameter at all** — these (and the parallel un-parameterized data in
  `blog-data.ts`/`photos.ts`) are where the ~118 literal placeholders live.
- `page.tsx`'s own 24 hits are NOT from `homepageContent()` (already
  brand-threaded) — they're separate hardcoded arrays defined directly in
  the page (a fake testimonials array with real-looking names, an FAQ array,
  image alt/caption text) that the brand migration hasn't reached yet.

This is real, live, and customer-facing (FAQ answers on service/neighborhood
pages telling a real prospect to "Text (555) 555-5555" to book; homepage
testimonials naming "Your Business"; blog post meta descriptions), but it's
a **~12-file, ~118-instance migration** — threading `brand`/`config` through
several un-parameterized content functions plus per-file literal-array
edits — not a same-round continuation. Per this lane's established
partial-close-then-flag pattern (see the seo_overrides thread: flagged at
`ed6aeba2`, closed 3 rounds later), leaving this scoped and counted rather
than rushing an unverified 118-edit sweep in the same turn as the 6-file fix
above.

**Also noticed, not fixed:** `src/app/site/template/_components/HeroChat.tsx`
(2 hardcoded fake-phone error messages) is **dead code** — not imported by
`page.tsx` or anywhere else under `/site/template` (confirmed via repo-wide
grep for the import path). `src/app/site/page.tsx` uses a different,
unrelated `@/components/marketing/HeroChat` for the platform's own marketing
site. Not touched — fixing dead code has no live effect and fixing it would
misleadingly suggest it matters.

**Also noticed, not fixed:** `ReviewsList.tsx`/`ReviewForm.tsx`'s avatar
badges hardcode the initial "M" (presumably from nycmaid's original build)
instead of the tenant's first initial — same bug class, small, left for the
same reason as above (kept this round's diff to the exact strings already
being tracked). `ReviewForm.tsx`'s "Verified Business · NYC Since 2018"
subtitle hardcodes a founding year that isn't even tenant-resolved in
`SiteConfig` yet (`identity.foundedYear` is a static default, not
DB-sourced) — a missing-feature gap, not a simple prop-wire.
`reviews/page.tsx` + `ReviewsList.tsx`'s "Write a Review" link hardcodes
`https://g.page/r/CSX9IqciUG9SEAE/review` (nycmaid's own Google review link)
for every template tenant regardless of industry branch — every non-nycmaid
cleaning tenant's real reviewers get routed to leave a review on nycmaid's
Google Business listing. Significant if real, but needs its own
investigation (does `tenant.google_place_id` exist and is there an existing
helper to build a review URL from it?) — flagging rather than guessing.

## NOTICED — not fixed, flagging for the leader/Jeff

1. The ~118-instance server-rendered placeholder-branding migration above
   (new item, scoped with exact per-file counts).
2. `_components/HeroChat.tsx` dead code (new item).
3. Avatar-initial "M" hardcode + Google review link hardcode in the reviews
   surface (new items, under the same investigation as #1).
4. Carried forward unchanged from prior rounds' lists (items 1-21).

## MISSING-FEATURE GAPS

Carried forward from prior rounds' list, items 1-26, plus: `SiteConfig.identity.foundedYear`
has no real per-tenant source (static default only) — flagged above.

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker. 11 code files changed +
7 new test files, committed as 1 commit.
