# Vercel Cost Optimization — Full Direction Plan

**Goal:** Vercel is at ~$200/mo trending toward $500. Get it back to near-flat.
**Root cause (hypothesis, confirm in Step 0):** every commit rebuilds ~25 tenant
marketing sites, and many dynamic routes pre-generate thousands of pages + OG
images **at build time** via `generateStaticParams`. Plus per-request image
optimization and middleware invocations. Jeff commits frequently → each push is a
full mass build.

**Core principle Jeff stated:** *All site pages are effectively static and never
change — EXCEPT employment/jobs pages, which must refresh every 15 days for
Google Jobs.* So: build almost nothing at deploy; serve on-demand + cache; only
employment pages self-refresh on a 15-day ISR clock.

---

## Step 0 — MEASURE FIRST (do not skip)
Vercel → project `platform` → **Usage**. Identify the dominant line item:
Build Execution · Image Optimization · Function Invocations/Duration · Edge
Middleware · Bandwidth. That decides priority. Screenshot the breakdown.

## Step 1 — Kill build-time mass generation (biggest lever)
`grep -rl generateStaticParams src/app` → dozens of dynamic content routes
(blog/[slug], locations/[state]/[city], services/[slug], streets/highways/
tunnels/bridges/[slug], etc.). For each **content** route:
- `export function generateStaticParams() { return [] }`  ← build none
- `export const revalidate = false`  ← static, cached until next deploy (EXCEPT employment, Step 3)
- keep `dynamicParams` default `true` so pages render on first request.

Verify with `next build`: the routes should show as ƒ/ISR, not hundreds of ● SSG prerenders.

## Step 2 — OG images on-demand
All `opengraph-image.tsx` with `generateStaticParams` → `return []`.
Confirmed offenders (roadside): bridges/[slug], streets/[slug], highways/[slug],
tunnels/[slug], services/[slug], locations/[state], locations/[state]/[city].
OG images then generate on first crawler hit and cache. (~$118/cycle per our notes.)

## Step 3 — Employment pages = 15-day ISR (the ONE exception)
Find the employment/careers/apply route(s) — **Jeff to confirm the folder**
(likely `/apply`, `/careers`, or an employment page under each tenant site).
Set on those pages only:
- `export const revalidate = 1296000`  // 15 days in seconds
They self-refresh for Google Jobs freshness with **no rebuild**.

## Step 4 — Ignored Build Step
Vercel → Settings → Git → **Ignored Build Step**. Add a command that exits 0
(skip build) when the push doesn't change deployable code (e.g. docs/memory-only
commits). Turns "build on every commit" into "build only when it matters."

## Step 5 — Image Optimization cost
If Step 0 shows Image Optimization is large: audit `next/image` usage on the
marketing sites. Options: `images.unoptimized = true` for the static tenant sites
(serve correctly-sized assets directly), raise `images.minimumCacheTTL`, and cut
the number of distinct source images (Vercel bills per source image optimized).

## Step 6 — Functions / crons / middleware
- Crons (`vercel.json`): currently daily/hourly — fine, not a driver.
- `api/cron/comhub-email` now loops all tenants' IMAP (maxDuration 60) — watch its
  duration as tenants add IMAP; it already skips tenants without creds.
- **Middleware runs on every request** across all tenant domains and does DB
  tenant lookups (`getTenantBySlug`/`getTenantByDomain`). Ensure those are cached
  (memory/edge cache) — middleware invocations are a hidden cost at scale.

## Step 7 — Verify
- Redeploy; build time should drop sharply (was minutes × sites).
- Recheck Usage after a few days; confirm downward trend.
- Spot-check: OG images still render (social debugger), employment pages fresh,
  static pages load (first hit slightly slower, then cached).

---

## Context for the executing chat
- Repo: `~/fullloopcrm/platform`, branch `main`, push as gh user **fullloopcrm**.
- Multi-tenant: ~25 sites under `src/app/site/<slug>` + shared `src/app/site/template`. **Live sites — verify before pushing.**
- A **concurrent session** may be editing this tree — check diffs, stage only your hunks (use `git hash-object` + `git update-index` plumbing if a shared file has others' uncommitted changes).
- Dev server runs on **:7864** (`next dev -p 7864`).
- Do the sweep in batches per route-type; run `next build` locally to confirm the prerender count collapses before pushing.
- This is on a **shared shell** — `.env` Clerk keys are placeholders; `admin_token` bypasses Clerk on `/dashboard` (middleware).
