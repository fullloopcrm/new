# Google Business Profile monitoring — research + build plan (doc only, no code)

Source: 05:57 LEADER→W3 order (3rd of 4 flagged gaps: "GBP isn't touched at all —
no monitoring on reviews/NAP-consistency/hours/photos"). This is research +
proposal only, file-only, no push/deploy/DB.

## Correction to the premise, confirmed by reading the code

**Reviews ARE already monitored.** This is not a from-scratch build:

- `src/app/api/cron/sync-google-reviews/route.ts` — scheduled sync of reviews
  per tenant into `google_reviews` (paginated, upserted, fires a `notifications`
  row on new reviews).
- `src/app/api/cron/auto-reply-reviews/route.ts` + `src/lib/google-reviews.ts`
  — auto-replies to unreplied reviews per tenant, gated by
  `tenant_settings.google_auto_reply`.
- Both ride a **working per-tenant OAuth connection** that already exists:
  `src/app/api/google/auth/route.ts` (dashboard-initiated OAuth, scope
  `https://www.googleapis.com/auth/business.manage`, `access_type=offline`,
  CSRF-safe signed state binding the grant to a tenant) →
  `src/app/api/google/callback/route.ts` (exchanges code, stores encrypted
  refresh token in `tenants.google_tokens`, fetches account+location via the
  **current** Business Profile APIs — `mybusinessaccountmanagement.googleapis.com/v1/accounts`
  then `mybusinessbusinessinformation.googleapis.com/v1/{account}/locations`
  — and saves a name/address snapshot into `tenants.google_business`) →
  `src/lib/google.ts` (`getValidAccessToken`, auto-refreshes, reused by both
  crons above).

So the hard part the leader's framing implies — "does this need a real
write-access grant per tenant like GSC did" — **is already solved and already
shipped.** Every tenant who has clicked "Connect Google" in the dashboard has
already granted the one scope that covers every Business Profile API
(confirmed below). No new consent flow is needed for what this doc proposes.

**What's actually missing**, confirmed by grepping every GBP-related call site
in the repo:

| Signal | Status |
|---|---|
| Reviews (read + reply) | ✅ Built, scheduled, working |
| NAP (name/address/phone) | ⚠️ One-time snapshot at connect time only (`readMask=name,title,storefrontAddress` in the callback) — never re-checked, no phone captured, no drift detection |
| Hours (regular + special) | ❌ Never fetched anywhere |
| Categories / attributes | ❌ Never fetched anywhere |
| Photos | ❌ Never touched |
| Performance/Insights (views, calls, direction requests, site clicks) | ❌ Never touched |

So the leader's gap is real for hours/photos/performance and for *ongoing*
NAP monitoring — just not for reviews, which should be struck from the list
of things to build.

## API landscape (verified against Google's current docs, not training-data recall)

Google retired the old monolithic `mybusiness.googleapis.com/v4` API in
April 2022 and split it into separate REST services. As of this research
(mid-2026) the live ones relevant here:

| API | Base host | Covers |
|---|---|---|
| Account Management | `mybusinessaccountmanagement.googleapis.com/v1` | accounts, admins, location groups — **already used** in the OAuth callback |
| Business Information | `mybusinessbusinessinformation.googleapis.com/v1` | name/title, address, phone, categories, regular + special hours, attributes — **already used** for the connect-time snapshot, just with a narrow `readMask` |
| Business Profile Performance | `businessprofileperformance.googleapis.com` | daily/monthly metrics: search views, calls, direction requests, website clicks (replaced the old v4 `reportInsights`, which stopped working March 2023) |
| Reviews | still `mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/reviews` | **Not deprecated** — Google's own sunset-dates page does not list it, and it's still receiving feature updates (policy-violation visibility on rejected replies). Legacy path, but functional. Already what `google-reviews.ts` uses. |
| Verifications, Notifications, Lodging, Place Actions | separate hosts, not relevant to this gap | — |

Two things worth flagging precisely because they're easy to get wrong:

1. **One OAuth scope covers everything**: `https://www.googleapis.com/auth/business.manage`
   is the single scope for all Business Profile APIs — the existing
   `/api/google/auth` route already requests it, so no re-consent is needed
   to add Performance/Business Information reads to what a tenant already
   granted.
2. **Access is gated, but it's a one-time per-project gate, not per-tenant.**
   New Google Cloud projects start at **0 quota** for these APIs regardless
   of OAuth scope. Google requires submitting the "Application for Basic API
   Access" form (needs: the requesting Cloud project number, a Google account
   that's owner/manager on a Business Profile verified+active 60+ days, and a
   business website) before any calls succeed. Once approved: 300
   queries/minute per API (Business Information additionally caps at 10
   edits/min/profile, 300/day for create-location and search-location calls).
   This gate applies to the **project FullLoop already owns** — it is not
   something each tenant needs to do. Evidence it's very likely already
   cleared: the OAuth callback's production code calls both
   `mybusinessaccountmanagement` and `mybusinessbusinessinformation` v1 today
   to build the connect-time snapshot, which would 403/return empty on a
   0-quota project. I have not personally confirmed live quota status from
   this worktree (no way to make a real authenticated call here) — **first
   task of implementation should be one live read-only test call against a
   real connected tenant to confirm the readMask fields actually return
   before building the cron around them**, not an assumption baked into the
   plan.

## Per-tenant OAuth vs. service account — the actual answer

GSC's service-account pattern (`gsc.ts`) works because Search Console supports
granting a single service-account email domain-wide-style access to many
properties. **Business Profile APIs have no equivalent** — a location can
only be managed by a Google identity that's an actual owner/manager on that
profile, so a service account can't be centrally granted access the way it
can for GSC. The correct pattern is per-tenant OAuth, which is exactly what's
already built. There's no cheaper alternative to research here; this part of
the leader's question is answered by "already done, reuse it."

## Build plan

### Phase 1 — Business Information drift monitoring (read-only, reuses existing token)

- New `runGbpProfileScan()` in `src/lib/seo/gbp.ts`, same shape as
  `vitals.ts`: iterate tenants with a `google_business.location_name` set,
  call `getValidAccessToken(tenantId)` (existing), then
  `GET mybusinessbusinessinformation.googleapis.com/v1/{location_name}?readMask=title,phoneNumbers,storefrontAddress,regularHours,specialHours,categories,profile`
  (wider mask than the connect-time call).
- Store the latest snapshot per tenant (upsert, not time-series — we care
  about drift, not history) and diff against the previous snapshot each run.
  On a real change to name/phone/address/hours/primary category, insert a
  `notifications` row (existing table, same pattern `sync-google-reviews`
  already uses) — this is a business-relevant signal ("someone changed your
  Google listing" or "your Google hours don't match your booking hours"),
  not noise, so alert-on-change fits better here than the append-only
  `seo_vitals` style.
- New cron route `api/cron/seo-gbp-profile`, same `verifyCronSecret` gate as
  every other cron here. Not wired into `vercel.json` (consolidation step,
  per standing instruction).

### Phase 2 — Performance/Insights (read-only, reuses existing token) — BUILT 2026-07-16

- `businessprofileperformance.googleapis.com` `fetchMultiDailyMetricsTimeSeries`
  endpoint (verified live against Google's current docs, not recalled from
  training data — exact query-param shape: repeated `dailyMetrics=X`, nested
  `dailyRange.start_date.{year,month,day}` / `dailyRange.end_date.{year,month,day}`).
  Pulls `BUSINESS_IMPRESSIONS_{DESKTOP,MOBILE}_{SEARCH,MAPS}`, `CALL_CLICKS`,
  `BUSINESS_DIRECTION_REQUESTS`, `WEBSITE_CLICKS` per connected location.
- `src/lib/seo/gbp-performance.ts` — `runGbpPerformanceScan()`, one row per
  (tenant, day), **upserted** on a 30-day trailing window rather than
  blind-appended like `vitals.ts`: Google's own docs don't state a revision
  window, but recent-day analytics counts are commonly revised after first
  report, so upsert-on-window is the safer default until observed otherwise.
- `src/lib/migrations/2026_07_16_seo_gbp_performance.sql` — new
  `seo_gbp_performance` table, file only, not applied.
- `api/cron/seo-gbp-performance` — same `verifyCronSecret` gate, not wired
  into `vercel.json` (consolidation step, per standing instruction).
- Not personally verified with a live authenticated call from this worktree
  (same caveat as Phase 1: no way to make a real Google API call here) —
  first live run should confirm the response actually parses as expected
  before this cron is scheduled.

### Photos — flagged as a follow-up spike, not built blind

Google's docs on where photo/media management now lives were inconsistent
across sources I could verify in this pass (the old v4 media endpoints were
part of the retired monolith; I could not pin down a single authoritative
current replacement host with confidence). Rather than guess at an endpoint
and ship code against it, recommend a narrow research spike before Phase 3:
confirm the current photo-count/media-listing endpoint with one real
authenticated call, then scope a minimal "photo count dropped to zero" or
"no photos uploaded in N days" check — that's most of the practical value
without needing full media moderation.

### Not recommending as part of this work

Migrating `google-reviews.ts`/`sync-google-reviews` off the legacy v4 reviews
endpoint onto whatever the modern equivalent is. It's inconsistent with the
rest of the codebase (which already migrated account/location lookups to
v1), but Google's own docs don't list it as deprecated or scheduled for
sunset, so this is a cleanup nice-to-have, not part of closing this gap.

## What needs Jeff, what doesn't

- **Nothing needs a new per-tenant grant.** Existing "Connect Google" OAuth
  already covers every read this plan proposes.
- **One thing worth Jeff confirming, not re-doing**: whether FullLoop's
  Google Cloud project has confirmed Basic API Access approval (vs. it
  happening to work because whoever set it up already got approved and
  nobody wrote it down). This is a one-time lookup in Google Cloud Console
  under the project's Business Profile API quota page — I can't check it
  from this worktree.
- Everything else in Phase 1/2 is a normal code build once someone (me, next
  order, or whoever picks this up) does the one live test call to confirm
  the wider `readMask` actually returns hours/phone/categories for a real
  connected tenant.
