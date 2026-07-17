# W2 gap/fluidity refresh — 2026-07-17 18:40 EDT

Leader's fresh 3-deep queue (18:25): (1) new fresh-ground surface; (2)
continue whichever surface (1) opens up; (3) keep gap/fluidity current.

## (1) Fresh ground: CTABlock's carried-forward "Write a Review" leak, closed

Last round (`w2-server-rendered-template-branding-gap-2026-07-17-1820.md`)
flagged but did not fix: `_components/CTABlock.tsx`'s "Write a Review" link
hardcoded `https://g.page/r/CSX9IqciUG9SEAE/review` — nycmaid's own real
Google Business listing — for every template tenant, on all 9 pages that
render CTABlock. A competing tenant's customer clicking that link left a
review on nycmaid's listing, not their own. This is the same
resolver-precedence bug class as the whole session's domain-fallback work,
just for a business-identity field (Google review destination) instead of a
domain/phone/name.

**Root cause + fix:** `SiteConfig` had no review-destination field at all.
Traced the established resolver pattern already used elsewhere in the
codebase for this exact concern — `messaging/brand.ts`'s `tenantBrand()` and
`/api/reviews/request` both build `https://search.google.com/local/writereview?placeid=${tenant.google_place_id}`
from the real `tenants.google_place_id` column; `onboarding-gate.ts` /
`site-readiness.ts` / `activate-tenant.ts` all treat
`google_place_id || selena_config.google_review_link` as "is a review
destination configured"; `cron/post-job-followup` falls back to an internal
`/reviews/submit` page when neither exists. Unified these into one
`SiteConfig.reviewUrl` resolved in `_config/load.ts`:
`google_place_id` (builds the canonical URL) → raw `selena_config.google_review_link`
→ neutral `/reviews/submit` default — never another tenant's real listing.

**Files changed:**
- `_config/types.ts` — added `reviewUrl: string` to `SiteConfig`.
- `_config/site.ts` — neutral default `'/reviews/submit'`.
- `_config/load.ts` — resolves the precedence above per tenant.
- `_components/CTABlock.tsx` — takes `reviewUrl` prop, no more hardcoded href.
- 8 page files (9 render call sites: `page.tsx`, `service-areas/page.tsx`,
  `get-paid-for-cleaning-referrals-.../page.tsx`, `[slug]/[service]/page.tsx`,
  `reviews/page.tsx`, `service/nyc-emergency-cleaning-service/page.tsx`,
  `[slug]/page.tsx` x2, `services/[slug]/page.tsx`) — pass
  `reviewUrl={config.reviewUrl}` through to CTABlock.

## (2) Continuation: same hardcode existed independently in 3 more places

A full-render test on the homepage (not file-level grep — same method that
caught last round's CTABlock bug) surfaced that CTABlock was not the only
instance: `page.tsx`'s own "Reviews widget" JSX (a second, independent
hardcode of the identical `g.page/r/CSX9IqciUG9SEAE/review` string, ~509
lines away from CTABlock's usage) had the same bug. Grepped the literal
across the whole repo to find every remaining live instance and fixed all of
them:

- `page.tsx` — homepage "Reviews widget" header CTA.
- `reviews/page.tsx` — the cleaning-tenant reviews-page "Write a Review" CTA
  (the non-cleaning branch in the same file already correctly had "no
  hardcoded Google place" per its own comment — this was an inconsistency
  between the two branches, not a separate bug).
- `reviews/ReviewsList.tsx` — a shared client component rendered by both
  branches of `reviews/page.tsx`; added a `reviewUrl` prop (same pattern as
  `businessName`), wired both call sites.
- `_components/MarketingFooter.tsx` — already received the full `SiteConfig`
  object, one-line fix.

**Confirmed correctly out of scope, left untouched:**
- `src/app/site/nycmaid/**` and `src/lib/nycmaid/*-templates.ts` — nycmaid's
  own bespoke, tenant-namespaced files. nycmaid's own real Google listing is
  the *correct* value here, not a bug (same "bespoke non-template sites
  confirmed correctly out of scope" call from `eb9db825`).
- `careers/operations-coordinator/page.tsx` (3 instances) — already flagged
  last round as nycmaid-specific job-ad body copy baked into the shared
  template (a content-applicability product call, not a branding-resolver
  bug); re-confirmed, not re-litigated.
- `api/reviews/request/route.ts`, `messaging/brand.ts` — already correctly
  resolve per-tenant via `google_place_id`; these are the pattern `reviewUrl`
  was modeled on, not bugs.

## Tests

- `_config/load.reviewurl.test.ts` (new): place-id-builds-URL,
  raw-link-fallback, place-id-wins-over-raw-link, neutral-default-when-
  unconfigured, and 2 wrong-tenant probes (tenant B's place id never leaks
  into tenant A's `reviewUrl`; an unconfigured tenant never inherits the
  previous request's tenant's link — catches state-bleed across sequential
  per-request resolution, not just a same-tick leak).
- `page.homepage-branding.test.tsx` — extended the existing full-render
  assertion to check both "Write a Review" links (reviews-widget + CTABlock)
  resolve to the mocked `reviewUrl`, never `g.page`.
- `reviews/ReviewsList.test.tsx` — added a `reviewUrl` prop assertion.
- `[slug]/page.branding.test.tsx` — mock config updated with `reviewUrl`
  (no new assertions needed there; `[slug]/page.tsx` doesn't render the
  Reviews widget or ReviewsList).

tsc clean. eslint: 4 pre-existing warnings on touched files (unrelated lines
— `<img>` LCP hints, one already-unused import), 0 new. Full suite: 650/650
files, 2788/2825 tests passed, 37 pre-existing skips, 0 failures (7 new
tests: 5 in load.reviewurl.test.ts, 1 in ReviewsList.test.tsx, 1 assertion
extended in-place in page.homepage-branding.test.tsx).

## (3) Next-round direction

No open resolver-precedence/reviewUrl candidates remain — literal grep for
the hardcoded string across the whole repo (outside nycmaid's own bespoke
tree and the already-triaged operations-coordinator content) came back
clean. Untouched carry-forwards from prior rounds: telnyx_phone/
telnyx_api_key fallback precedence, per-tenant credential resolution
(resend_api_key/stripe_api_key) — flagged 2 rounds ago, not yet
investigated. File-only, no push/deploy/DB.
