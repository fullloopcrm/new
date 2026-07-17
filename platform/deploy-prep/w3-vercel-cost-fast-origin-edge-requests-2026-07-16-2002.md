# Vercel cost investigation — Fast Origin Transfer ($22.07) + Edge Requests ($3.11 + $2.00 CPU)

Lane per LEADER->W3 19:45: oversized/uncached assets, redundant edge middleware
invocations, concrete caching-header/middleware-scoping fixes with SEO-impact
notes. File-only, nothing applied, no push/deploy/DB.

**Correction for the record:** this session's LEADER-order text (passed into
the worker prompt) only contained the 19:45 `LEADER->ALL` broadcast about the
Vercel pivot, not the follow-up `LEADER->W3` line assigning this specific
lane (Fast Origin Transfer + Edge Requests, distinct from W1's ISR-Writes lane
and W2's Build-CPU lane). I spent the first ~25 min of this session
investigating ISR Writes / Build CPU instead — ground W1, W2, and (per the
channel) W4 already covered. Caught it by reading `LEADER-CHANNEL.md` past
the broadcast line before writing this report, and pivoted. Flagging so it's
not silently absorbed: no code was changed during that detour, so nothing to
revert, but it was real wasted time against the wrong lane.

## What I checked

### 1. `next.config.ts` `images` block — no `minimumCacheTTL` set

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'images.pexels.com' },
    { protocol: 'https', hostname: 'www.pexels.com' },
    { protocol: 'https', hostname: 'images.unsplash.com' },
  ],
},
```

Every tenant marketing site's hero/gallery imagery is pulled live from Pexels/
Unsplash through `next/image` (57 files use `next/image`; confirmed these 3
remote hosts are the only external image sources configured). With no
`minimumCacheTTL` override, Vercel's Image Optimization cache falls back to
the framework default — I could not pin down the exact default for this
specific Next 16.2.10 install without either running a live build or Vercel
dashboard access, so I'm not asserting a number, just that it's currently
implicit rather than deliberately chosen. A short default TTL means the
optimizer re-fetches the same Pexels/Unsplash source image (counted as
inbound origin transfer) more often than the source photos actually change —
which, for hero images on evergreen marketing pages, is close to never.

**Proposal:** add `minimumCacheTTL: 2592000` (30 days) to the `images` block,
matching the 30-day ISR revalidate convention this codebase already
standardized on for the same reason (commit `4fc9fb03`, "static content that
only changes on deploy"). One line, `next.config.ts` only.

**SEO impact:** none — this only affects how long Vercel caches the
*optimized/resized* image bytes at its edge, not the source URL, alt text, or
any indexed page content. Image search freshness is unaffected because the
underlying Pexels/Unsplash URLs don't change without a code deploy anyway
(they're hardcoded per-component, not admin-editable).

### 2. Middleware tenant-lookup caching — already has an in-memory 5-min TTL cache, effectiveness unverifiable from this worktree

`src/lib/tenant-lookup.ts`'s `getTenantBySlug`/`getTenantByDomain` (called
from `src/middleware.ts` on every request to a tenant subdomain or custom
domain — i.e. all traffic to all ~20+ tenant sites) already have a 5-minute
in-memory `Map` cache with negative caching. That's a real, deliberate
mitigation already in place — not a gap.

What I can't verify without Vercel dashboard/function-log access: Edge
Middleware runs across many geographically distributed isolates, and an
in-process `Map` only helps if repeat requests land on the *same* isolate
within the TTL window. For a globally-distributed tenant base this cache's
real-world hit rate could be much lower than "5-minute TTL" implies — every
cold isolate pays a live Supabase round-trip (2-3 sequential queries on a
`getTenantByDomain` full miss: `tenants.domain` → `tenant_domains` →
`tenants.id`), which is real Edge Request CPU duration.

**Proposal (bigger lever, not a quick file fix — flagging, not building):**
if Vercel's function logs show meaningful cache-miss volume on tenant
lookups, move the cache to a globally-shared store (Vercel Edge Config, which
is built for exactly this read-heavy/low-write lookup pattern, or Vercel KV)
instead of per-isolate memory. This is an infra change requiring a Vercel
resource, not a plain code edit — needs leader+Jeff sign-off, not something
to land file-only.

**SEO impact:** none — tenant resolution is purely internal routing plumbing,
invisible to crawlers and end users either way.

### 3. Middleware matcher has one redundant pattern (cosmetic, not a cost driver)

```ts
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

The second pattern (`/(api|trpc)(.*)`) is redundant: `/api/*` paths don't end
in any of the excluded extensions, so the first pattern already matches them.
Next's matcher only needs one pattern to hit for middleware to run once per
request — having both listed doesn't cause a double-invocation (verified
against Next's matcher semantics: it's an OR of patterns, not an AND-count),
so this is **not** a real cost bug, just dead redundancy. Not proposing a
change — correcting my own initial hypothesis here rather than shipping a
finding I couldn't actually stand behind after checking.

### 4. 20 `opengraph-image.tsx` routes, several combinatorial, no explicit `revalidate`

`src/app/site/nycroadsideemergencyassistance/{services,locations,streets,
highways,bridges,tunnels}/[slug or state/city]/opengraph-image.tsx` (9 of the
20) generate PNGs via `next/og`'s `ImageResponse` (Satori render — real CPU
per cold render, more expensive than a typical page render) for combinatorial
route params, using `generateStaticParams() { return [] }` with no dynamic
data fetching (pure local lookups) and no explicit `revalidate` export.

I could not confirm from this worktree whether Next 16's file-convention
image routes without an explicit `revalidate` export are (a) statically
generated once and cached indefinitely, matching their sibling `page.tsx`
files' behavior, or (b) re-rendered per request absent an explicit static
signal — this needs either a live Vercel function-invocation count for these
routes or a local `next build` output trace to settle, neither of which I ran
(per the token-guard/local-only constraint on this worktree). Flagging as
genuinely open rather than guessing.

**Proposal (low-risk either way):** add `export const revalidate = 2592000`
explicitly to these 9 files, matching the 30-day convention already used on
every sibling `page.tsx` in the same route tree. If they're already static,
this is a no-op. If they're currently re-rendering per request, this caps
the Satori CPU cost and the resulting PNG's transfer to once per 30 days per
unique params, which directly reduces both Edge/Function CPU and Fast Origin
Transfer for image-crawler traffic (Slack/Twitter/Facebook link-unfurl bots
re-fetch OG images on every share).

**SEO impact:** none — OG images aren't an indexing signal Google uses for
ranking/freshness (they affect social-share card appearance only), and the
underlying place/route content these images summarize doesn't change without
a code deploy.

### 5. `/api/tenant-sitemap` (fallback sitemap, most tenants) already caches correctly; per-tenant rich `sitemap.ts` files (the ~20 biggest tenants, highest URL counts) have no explicit cache signal

`src/app/api/tenant-sitemap/route.ts` sets `Cache-Control: public,
max-age=3600, s-maxage=3600` (1hr) — already handled, no action needed.

The 20 tenants in `TENANTS_WITH_RICH_SITEMAP` (the ones with the largest
combinatorial URL counts — toll-trucks-near-me, nyc-tow, we-pay-you-junk,
etc.) instead use file-convention `sitemap.ts` (e.g.
`src/app/site/toll-trucks-near-me/sitemap.ts`), which read pure local data
(no DB/fetch) and have no `revalidate` export either. Same open question as
#4: Next's default caching for a no-dynamic-API metadata route is likely
"static, cached until next deploy" — which would mean these already cost
effectively nothing per request — but I can't confirm the actual runtime
behavior from this worktree.

**Proposal:** if leader/Jeff can pull actual Vercel function-invocation
counts for `/site/*/sitemap.xml` and it shows real per-request cost, add an
explicit `export const revalidate = 86400` (1 day — sitemaps are crawled
often and cheap to regenerate from local data, no reason to match the 30-day
page-content window) to make the behavior explicit rather than default-
inferred. Not applying blind since I don't have evidence this is currently
costing anything.

**SEO impact:** explicit caution here since sitemaps ARE a direct SEO signal
— crawlers use sitemap freshness/entries to find and re-crawl pages. A 1-day
cache is well within normal crawl-budget tolerances (Google doesn't expect
sub-daily sitemap changes for this kind of content) and the entries
themselves don't change without a code deploy anyway (no DB-driven URLs in
these particular sitemaps), so caching doesn't create stale/missing-page risk.

## Noticed, not fixed (out of this lane's scope)

- `src/app/site/nyc-classifieds/{ImageUploader.tsx (both copies),
  PostListingClient.tsx, AccountClient.tsx}` all `fetch('/api/upload', ...)`
  (singular) but the only route that exists is `src/app/api/uploads/route.ts`
  (plural) — no rewrite bridges the two. Every listing-photo and profile-photo
  upload in nyc-classifieds 404s today. This means my initial hypothesis
  ("uncached raw `<img>` tags on user-uploaded listing photos inflate Origin
  Transfer") doesn't hold in practice — uploads can't succeed, so there's
  little/no real image data behind those `<img>` tags to transfer. Real
  functional bug, unrelated to cost, not mine to fix under this lane — flagging
  for whoever owns nyc-classifieds.
- Same `ListingCard.tsx`/`ListingRow.tsx` `<img>` tags (not `next/image`) do
  point at Supabase Storage public URLs directly (`supabaseAdmin.storage...
  getPublicUrl`), not proxied through the Vercel app — confirmed these do NOT
  count toward Vercel Fast Origin Transfer even when upload is working, since
  Supabase serves those bytes directly. Worth a `next/image` conversion for
  Core Web Vitals/LCP once the upload bug is fixed, but zero Vercel-billing
  relevance, so not part of this doc's recommendations.

## Summary — recommended order

1. `images.minimumCacheTTL = 2592000` in `next.config.ts` (#1) — highest
   confidence, lowest risk, one line.
2. `export const revalidate = 2592000` on the 9 combinatorial
   nycroadsideemergencyassistance OG-image routes (#4) — safe either way,
   closes a real unknown.
3. Everything else (#2 Edge Config migration, #5 sitemap revalidate) needs
   either Vercel dashboard/function-log numbers or Jeff's call before
   proposing a specific change — flagged, not written as a diff.

Not applied. Awaiting leader/Jeff.
