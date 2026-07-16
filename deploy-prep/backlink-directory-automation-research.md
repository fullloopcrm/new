# Backlink directory automation research — W2, 2026-07-16

Context: `src/lib/seo/backlinks.ts` (Phase 4) generates citation-directory
listing proposals into `seo_backlink_opportunities`, reviewed at
`/admin/seo` via `backlinks-panel.tsx`. Until this pass, "approve" only
flipped a status column — nothing executed the actual directory submission,
and the review UI gave a human nothing but a source name + URL to work from.

Task: find what part of directory submission is genuinely automatable (a
documented public API), and build a real manual-steps checklist for
whatever isn't, surfaced in the review UI.

## Finding: no source in the catalog has a public, ownership-free submission API

All 19 sources in `CITATION_SOURCES` were checked for a documented API that
would let a third party (us, on a tenant's behalf) create a new business
listing without that tenant's own authenticated account on the platform.

| Source | API exists? | Why it can't be auto-submitted by a third party |
|---|---|---|
| Google Business Profile | Yes — Business Profile APIs (`mybusinessbusinessinformation`, `mybusinessaccountmanagement`) | Requires OAuth as the business owner's own Google account. **We already have this** for tenants who connected via `/dashboard/google` (`business.manage` scope, `tenants.google_tokens`/`google_business`) — see below. A *new*, not-yet-existing location still requires Google's own verification step (phone/email/postcard) that can't be bypassed via API. |
| Bing Places | Yes — Bing Places API | OAuth-gated to a Microsoft account we don't hold per tenant. Does support "Import from Google," which shortcuts the manual entry if GBP is already connected — folded into the manual-steps output (see below). |
| Apple Maps Business Connect | No public third-party API | Submission is via Apple's own Maps Connect portal/app, or through Apple-approved data aggregators (Yext/Uberall) — not a documented open API. |
| Facebook Business Page | Graph API can create Pages, but only with a Facebook user access token belonging to the actual person/business — no generic third-party creation path. |
| Nextdoor Business | No public API | Web-form only. |
| Yelp for Business | Fusion API is read-only (search) | Yelp's own ToS prohibits third parties creating/managing listings via automation. |
| BBB | No API | Manual application + vetting; accreditation is a separate paid, audited process. |
| MapQuest/Foursquare | Foursquare has a Places (search) API, not a self-serve owner-submission API for third parties. |
| Manta | No public API | Web form only. |
| Alignable | No public API | Web form only. |
| YellowPages.com | No public API | Web form only. |
| Angi / HomeAdvisor / Thumbtack / Porch | No public submission API | Pro-profile signup is manual and, for regulated trades, often gated on license/insurance verification. |
| Houzz / BuildZoom | No public API | Manual signup. |
| StyleSeat | No public API | Manual signup. |

**This is by design, not a gap in their API surface.** Every one of these
platforms gates listing creation behind an owner-verification step
specifically to stop the exact thing an "auto-submit bot" would do — that's
also why we deliberately did not build a scraping/headless-browser
form-filler here: it would be racing the same anti-abuse controls these
platforms built to keep third parties from doing this.

## What's actually automatable — and what was built

**1. Real (not new) OAuth we already hold — used to stop a false-positive proposal.**
`src/lib/google.ts` already runs a legitimate per-tenant Google OAuth flow
(`business.manage` scope, `/api/google/auth` → `/api/google/callback`) used
today for Google Posts/review sync. `backlinks.ts`'s own header comment
already noted "verify this is not already claimed via tenants.google_business
before proposing" — but no code actually did that check, so a tenant who'd
already connected GBP would still get nagged with a stale "add Google
Business Profile" proposal forever.

Fixed: `loadActiveFleet()` now reads `tenants.google_business.location_name`
into `TenantFleetRow.googleBusinessConnected`, and
`proposeCitationsForTenant()` skips the `google_business_profile` source
entirely when that's already set. Zero new external calls — this uses data
the app already legitimately holds. Covered by a wrong-tenant probe
(`generateBacklinkProposals()` tests) confirming one tenant's connected
status never suppresses another tenant's proposal.

**2. Bing Places shortcut.** Bing supports importing a listing directly from
an existing Google Business Profile. `manualStepsFor()` detects
`tenant.googleBusinessConnected` and, for the `bing_places` source only,
swaps the generic "retype everything" checklist for "use the Import from
Google button" — real time saved, still manual (Bing's own account login),
but no longer redundant data entry.

**3. Manual-steps checklist for everything else.** Every proposed citation
row now carries a `listing.manualSteps: string[]` — an ordered,
source-specific checklist (search-before-duplicate, exact fields to paste,
trade-license heads-up for pro directories, "stop before the paid upsell"
for `self_serve_paid_upsell` sources, the BBB-accreditation-claim warning,
and the closing note that ownership verification is the one step no
directory here lets a third party skip). Rendered in `backlinks-panel.tsx`
as a collapsible `<ol>` per opportunity.

## Not built, and why

- **No headless-browser form automation.** Even where a directory only has a
  public web form (no login), scripting form submission on someone else's
  platform to create business listings crosses from "using a documented
  API" into automated bulk account/listing creation against a platform's own
  anti-abuse controls — outside what this task should build.
- **No new DB migration.** `tenants.google_business` already existed
  (migration `023_missing_per_tenant_api_keys.sql`); this pass only reads an
  existing column. No schema change, no prod write — pure app code.

## Files changed

- `src/lib/seo/backlinks.ts` — `TenantFleetRow.googleBusinessConnected`,
  `manualStepsFor()`, GBP-skip filter in `proposeCitationsForTenant()`.
- `src/lib/seo/backlinks.test.ts` — coverage for the above + a wrong-tenant
  probe for the new GBP-skip filter.
- `src/app/admin/seo/backlinks-panel.tsx` — renders `manualSteps` as a
  collapsible checklist per opportunity.
