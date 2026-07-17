# ISR Writes Cost Investigation — 2026-07-16

**Trigger:** ISR Writes is the 2nd-biggest Vercel line item ($101.01). This is a
file-only investigation + proposal — nothing below has been applied.

**Method:** Static analysis only (grep across `platform/src` for
`export const revalidate`, `revalidatePath`/`revalidateTag`, `fetch(...,{next:{revalidate}})`,
`dynamic = 'force-*'`). **I do not have Vercel Usage/Analytics access in this
session** (the `vercel` MCP connector isn't authorized here), so "real page
volume" below is estimated from route/param counts in the repo, not live
traffic. Flagging this as a real gap — the leader or Jeff should pull actual
per-route ISR write counts from Vercel Usage before prioritizing the fixes
below, in case traffic patterns invert my estimates.

---

## 1. Inventory — every revalidate/ISR config found

### Page-level `export const revalidate` (188 hits total)

| Value | Meaning | Where | Count |
|---|---|---|---|
| `2592000` (30d) | daily-eligible ISR, effectively monthly in practice | Vast majority of tenant site trees: `locations/`, `services/`, `blog/`, `who-we-serve/`, `areas/`, `industries/`, `[combo]`, etc. across ~20 tenants | ~150 routes |
| `1296000` (15d) | job-listing pages | `available-nyc-maid-jobs/[slug]` (nycmaid, florida-maid) | 2 routes |
| `604800` (7d) | | `the-nyc-exterminator/areas/[neighborhood]`, `.../careers/[slug]` | 2 routes |
| `259200` (3d) | job/careers listing index+detail (jobs added/removed more often than the date-only cron accounts for) | wash-and-fold-hoboken jobs, florida-maid jobs index, nycmaid commission-sales-partner | ~5 routes |
| `false` | fully static, on-demand only via `revalidatePath` | `the-nyc-marketing-company/*`, `consortium-nyc/*` | 5 routes |
| `3600` (API route, not a page) | `/api/territories/options` | called from middleware + 2 admin/apply forms, not a page-fan-out | 1 route |
| `0` | always dynamic | `/api/health` | 1 route |

**This 30-day-default pattern is already the fix from the earlier Vercel Cost
Optimization pass** (see `VERCEL-COST-OPTIMIZATION-PLAN.md`) — it's healthy and
not a new concern.

### On-demand `revalidatePath` / `revalidateTag` (only 2 call sites in the whole app)

| File | Trigger | Status |
|---|---|---|
| `src/app/api/cron/refresh-job-postings/route.ts` | cron, 1st+16th of month | **Already fixed** in commit `457c39c9` (was daily full-`layout` sweep of 22 tenant career subtrees; now 2x/month matching the 15-day Google Jobs freshness window). Nothing further to do here. |
| `src/app/api/admin/seo/apply/route.ts` | admin action (human-triggered) | Low volume by nature (a person clicking "apply" in the SEO admin tool). Not a cost driver. |

### Fetch-level `next: { revalidate: N }` (the part page-level audits miss)

This is the part of the ask that page-level `export const revalidate` greps
don't catch: **a route with no page-level `revalidate` export inherits its ISR
interval from the shortest `fetch(..., { next: { revalidate } })` found during
render.** Three call sites exist, and two of them are broader than they look:

| File | Value | Used by |
|---|---|---|
| `src/lib/caseStudyStats.ts` (`getCaseStudyStats()`) | 3600 (1h) | `(marketing)/page.tsx` (homepage), `(marketing)/location/[slug]/page.tsx` (**400 metros**, `generateStaticParams` returns `[]` → all rendered/cached on demand), `(marketing)/industry/[slug]/page.tsx` (**50 industries**), `(marketing)/case-study/the-nyc-maid/page.tsx` |
| `src/components/home/Reviews.tsx` | 3600 (1h) | `(marketing)/page.tsx` (homepage only) |
| `src/app/site/nyc-classifieds/porch/post/[id]/[slug]/page.tsx` | 60 (1 minute) | every individual classifieds forum post detail page (unbounded, user-generated, grows over time) |

---

## 2. Root cause: two surfaces revalidating far more than their content changes

### Finding A — 450 long-tail marketing pages inherit a 1-hour ISR clock meant for one homepage widget

`getCaseStudyStats()` is documented in its own file as: *"ISR-cached for 1h so
the marketing site refreshes hourly"* — a deliberate choice for the **homepage**,
where a live "clients served / bookings completed" ticker is a legitimate
hype/trust element worth refreshing hourly.

The problem: `(marketing)/location/[slug]/page.tsx` (400 metro pages) and
`(marketing)/industry/[slug]/page.tsx` (50 industry pages) call this **same
function directly**, and neither sets its own `export const revalidate`. Per
Next.js's caching model, that means **all 450 of these pages inherit the
homepage's 1-hour interval** — every one of them regenerates on next visit
after 60 minutes, all day, every day. That's up to 450 × 24 = 10,800
regenerations/day theoretically possible from this one code path, versus the
~1/day-amortized rate everywhere else in the codebase (30-day revalidate).

The actual page content on these 450 pages — city/industry-specific copy,
schema.org markup, breadcrumbs — is **static long-tail SEO content that
doesn't change hour to hour**. Only a small stats badge inside `LiveProofBand`
needs freshness, and it doesn't need per-page freshness — the underlying
numbers (`clients`, `bookingsCompleted`, etc.) are the same values on all 450
pages simultaneously; there's no reason each page independently re-fetches and
re-triggers a full-page regeneration to get them.

**Proposed fix (file-only, not applied):**
1. Set `export const revalidate = 2592000` explicitly on `location/[slug]/page.tsx`
   and `industry/[slug]/page.tsx` — same 30-day cadence as every sibling
   long-tail route in the codebase (`[combo]/page.tsx` already does this).
2. Leave the homepage (`(marketing)/page.tsx`) as-is at 1h — it's one page, not
   450, and the live-stats ticker is a deliberate homepage UX choice.
3. Longer-term (optional, bigger lift): move `getCaseStudyStats()` off the
   page-render fetch path entirely for the 450 long-tail pages — e.g. read the
   stats via `unstable_cache`/a shared 24h cache keyed independently of the
   page's own ISR clock, or render the stat badge as a client component that
   fetches on mount. That decouples "stat badge freshness" from "does this
   whole page need to regenerate," which is the actual root cause.

**SEO impact:** None expected, and arguably positive. Google doesn't crawl
long-tail location/industry pages hourly; a stale badge count for up to 30
days doesn't affect rankings, structured data validity, or sitemap accuracy —
the page's `lastmod`-relevant content (the copy, schema) isn't changing at that
cadence either. The only user-facing change is the stats badge reads slightly
staler on low-traffic long-tail pages, which is invisible to the vast majority
of visitors who aren't comparing it against the homepage in the same session.

### Finding B — every classifieds forum post page revalidates every 60 seconds, for a fetch used only to build metadata

`nyc-classifieds/porch/post/[id]/[slug]/page.tsx` fetches the post twice
(`revalidate: 60` on both calls) purely to build `generateMetadata()` (title,
description) and server-rendered JSON-LD. The actual visible post
content/replies are fetched **client-side** by `PorchPostClient.tsx` on mount —
so the 60-second server fetch buys freshness for metadata/structured data
only, not for what a visitor sees.

This route has no `generateStaticParams` (returns nothing, so it's fully
on-demand) and no upper bound on post count — it's user-generated classifieds
content that grows over time. Any post that gets even occasional repeat
traffic (a share link, a search hit, a bump) regenerates as often as once a
minute, indefinitely, for as long as the post exists. This is structurally the
same shape as the already-fixed career-page bug: a per-minute clock applied to
content (SEO metadata/dates) that doesn't need per-minute freshness.

**Proposed fix (file-only, not applied):**
1. Raise both fetch calls to `next: { revalidate: 3600 }` (1h) or `3600`→`21600`
   (6h) — reply counts and post edits are the only thing that could go stale,
   and that's already live via the client fetch. The server-rendered
   metadata/JSON-LD (title, `dateModified`, `commentCount`) doesn't need
   minute-level accuracy.
2. Alternative if even 1h is considered too frequent for a likely long-tail,
   low-traffic detail page: set page-level `export const revalidate = 86400`
   (daily) and drop the fetch-level override entirely, matching the pattern
   used for every other detail page in the codebase.

**SEO impact:** `commentCount`/`dateModified` in the `DiscussionForumPosting`
JSON-LD would reflect reality with up to 1h–24h lag instead of ~1min. Google
doesn't require minute-fresh structured data for forum posts, and Google's own
crawl frequency for a long-tail UGC page is nowhere near once a minute — this
change brings the cache freshness in line with realistic crawl cadence rather
than the reverse. No sitemap impact (this route isn't a sitemap-listed
canonical landing page family, it's individual post permalinks).

---

## 3. Confirmed clean — no action needed

- **The 30-day-revalidate pattern across ~150 routes** (locations, services,
  blog, careers index pages, etc.) — this is the already-executed fix from
  the prior Vercel Cost Optimization pass and is healthy.
- **`refresh-job-postings` cron** — already fixed (commit `457c39c9`), now
  2x/month instead of daily.
- **`revalidatePath` in `admin/seo/apply`** — human-triggered, low volume by
  construction, not a cost driver.
- **`src/app/site/template/*` pages** (the shared template every new tenant
  renders from) are `force-dynamic`, not ISR at all — they contribute to
  Function Invocations, not ISR Writes. Out of scope for this cost line, not
  flagging further here.
- **`the-nyc-marketing-company/*` and `consortium-nyc/*`** — `revalidate = false`,
  fully static except on-demand `revalidatePath`. Zero background ISR write cost.
- **`/api/territories/options`** (`revalidate = 3600`) — a single API route
  hit by middleware + two forms, not a page-fan-out. Trivial volume regardless
  of traffic level; not worth touching.

---

## 4. Summary of proposed changes

| Surface | Current | Proposed | Pages affected (est.) | SEO impact |
|---|---|---|---|---|
| `(marketing)/location/[slug]/page.tsx` | inherits 1h from `getCaseStudyStats()` | `export const revalidate = 2592000` | ~400 | None — matches every sibling long-tail route; stat badge staleness invisible to SEO |
| `(marketing)/industry/[slug]/page.tsx` | inherits 1h from `getCaseStudyStats()` | `export const revalidate = 2592000` | ~50 | Same as above |
| `nyc-classifieds/porch/post/[id]/[slug]/page.tsx` | fetch-level `revalidate: 60` (both fetches) | `revalidate: 3600` (or page-level `86400` + drop fetch override) | unbounded, growing (UGC) | Structured data lag goes from ~1min to 1h–24h; no realistic crawl-frequency mismatch |
| `(marketing)/page.tsx` (homepage) | 1h via `Reviews`/`getCaseStudyStats` | **no change** | 1 | n/a — deliberate live-stats UX on the one page that warrants it |

**Not proposing changes to:** the 30-day tenant-site family, the career cron
(already fixed), `revalidatePath` in seo/apply, `/api/territories/options`,
or `force-dynamic` template pages.

**Before implementing:** pull actual per-route ISR write counts from Vercel
Usage to confirm `location/[slug]` and `industry/[slug]` traffic is real
(if these 450 pages get near-zero traffic, the fix still helps but the $ impact
would be smaller than if they're getting steady long-tail hits — I couldn't
verify this without Vercel Analytics access in this session).
