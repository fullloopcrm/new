# NYC Maid legacy short-URL 404s — fix options (prep doc, no code changed)

Source: LEADER 15:44 3-deep queue item (1), W3 — this is prep only: file-only,
no push/deploy/DB, no behavior change applied. Underlying finding is Drift W
(commit `2dd91e81`, reconcile-tenant-config.mjs), which flags this as WARN;
this doc lays out the concrete fix options for Jeff's call on redirect vs.
build-the-pages.

## The problem, confirmed by reading the code just now

`platform/next.config.ts`'s `rewrites().afterFiles` has 8 bare `/site/<segment>`
legacy short-URL aliases meant to catch a middleware-rewritten tenant pathname
(the file's own comment: "these rewrites run AFTER middleware prefixes tenant
requests with /site"):

```ts
{ source: '/site/about', destination: '/site/about-the-nyc-maid-service-company' },
{ source: '/site/faq', destination: '/site/nyc-cleaning-service-frequently-asked-questions-in-2025' },
{ source: '/site/tips', destination: '/site/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' },
{ source: '/site/blog', destination: '/site/nyc-maid-service-blog' },
{ source: '/site/blog/:slug', destination: '/site/nyc-maid-service-blog/:slug' },
{ source: '/site/areas', destination: '/site/service-areas-served-by-the-nyc-maid' },
{ source: '/site/contact', destination: '/site/contact-the-nyc-maid-service-today' },
{ source: '/site/pricing', destination: '/site/updated-nyc-maid-service-industry-pricing' },
{ source: '/site/emergency', destination: '/site/service/nyc-emergency-cleaning-service' },
```

These sources are bare — no tenant slug segment. But `src/middleware.ts`'s
`rewriteToSite()` (lines ~429-434) only ever produces a bare `/site/<path>`
pathname for a `ROOT_SITE_TENANTS` member (`siteBase = '/site'`). nycmaid is
in `BESPOKE_SITE_TENANTS` (`siteBase = '/site/nycmaid'`), so its
middleware-rewritten pathname for `thenycmaid.com/about` is
`/site/nycmaid/about`, not `/site/about` — the rewrite source never matches.
`ROOT_SITE_TENANTS` is currently empty, so **no** tenant's real domain traffic
can ever hit these 8 rewrites today.

Verified live, not theoretical: `platform/src/app/site/nycmaid/` has only the
long-form folders (`about-the-nyc-maid-service-company`,
`nyc-cleaning-service-frequently-asked-questions-in-2025`,
`nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid`,
`nyc-maid-service-blog`, `service-areas-served-by-the-nyc-maid`,
`contact-the-nyc-maid-service-today`,
`updated-nyc-maid-service-industry-pricing`,
`service/nyc-emergency-cleaning-service`) — no `about/`, `faq/`, `tips/`,
`blog/` (short), `areas/`, `contact/`, `pricing/`, or `emergency/` folders. So
`thenycmaid.com/about`, `/faq`, `/tips`, `/blog`, `/blog/:slug`, `/areas`,
`/contact`, `/pricing`, `/emergency` all 404 today via the `[slug]` catch-all's
`notFound()`.

`reviews`, `services`, `referral`, `careers` are **not** affected the same
way — they happen to have their own real short-named folders directly under
`/site/nycmaid/`, so Next's filesystem routing resolves them before
`afterFiles` rewrites are ever consulted. That's a coincidence of naming, not
evidence the rewrite mechanism works — those 4 rewrite entries are equally
dead, just harmlessly so (destination already matches source content). This
doc is scoped to the 8 slugs that actually 404; the other 4 dead entries are
a minor "also worth deleting for clarity" item, not a user-facing bug.

`sitemap.xml/route.ts` for nycmaid lists the **long-form URLs** as canonical
(`/about-the-nyc-maid-service-company`, etc.) and each long-form page's own
`generateMetadata()` sets `alternates.canonical` to that same long URL — the
short URLs were never meant to be the canonical/indexed URL, only a
legacy/backlink convenience alias. This confirms the original intent
(per the `next.config.ts` comment "Clean marketing URLs are handled via
afterFiles rewrites above" left next to the unrelated `redirects()` block)
was exactly the mechanism that's now broken — not a redesign, a repair.

## Option A (recommended) — fix the rewrite entries in place, nycmaid-prefixed

Update each `source` and `destination` to the actual `/site/nycmaid/...`
pathname middleware now produces:

```ts
{ source: '/site/nycmaid/about', destination: '/site/nycmaid/about-the-nyc-maid-service-company' },
{ source: '/site/nycmaid/faq', destination: '/site/nycmaid/nyc-cleaning-service-frequently-asked-questions-in-2025' },
{ source: '/site/nycmaid/tips', destination: '/site/nycmaid/nyc-maid-and-cleaning-tips-and-advice-by-the-nyc-maid' },
{ source: '/site/nycmaid/blog', destination: '/site/nycmaid/nyc-maid-service-blog' },
{ source: '/site/nycmaid/blog/:slug', destination: '/site/nycmaid/nyc-maid-service-blog/:slug' },
{ source: '/site/nycmaid/areas', destination: '/site/nycmaid/service-areas-served-by-the-nyc-maid' },
{ source: '/site/nycmaid/contact', destination: '/site/nycmaid/contact-the-nyc-maid-service-today' },
{ source: '/site/nycmaid/pricing', destination: '/site/nycmaid/updated-nyc-maid-service-industry-pricing' },
{ source: '/site/nycmaid/emergency', destination: '/site/nycmaid/service/nyc-emergency-cleaning-service' },
```

This is an internal rewrite, not a redirect: the visitor's URL bar keeps
showing `thenycmaid.com/about` (preserves old bookmarks/backlinks/GBP-link
appearance exactly), while the served page's own `alternates.canonical`
still points at the long-form URL, so search engines still consolidate onto
the canonical without a duplicate-content signal.

**Collision safety:** because `afterFiles` rewrites run after both middleware
*and* the filesystem lookup, the source only ever matches a pathname
middleware already rewrote for nycmaid specifically (no other tenant's slug
produces `/site/nycmaid/...`) — no cross-tenant risk.

**Pros:** one file, restores the mechanism's own stated original intent
(per the adjacent comment), zero new pages, no visible URL change for
existing backlinks, no host-scoping needed.
**Cons:** none identified — this is a straight bugfix matching existing
design, not a new decision.

## Option B — real 301 redirects instead of a rewrite

Move these 8 into `next.config.ts`'s `redirects()` block instead (which
already carries a "Legacy nycmaid URLs → fullloop equivalents" section),
sending a permanent redirect from the short URL to the long-form canonical
URL, e.g. `{ source: '/about', destination: '/about-the-nyc-maid-service-company', permanent: true }`.

**Pros:** the visible URL becomes the canonical one going forward (no
long-term duplicate-URL-serving-same-content pattern), and it matches this
file's own existing precedent for other legacy nycmaid paths
(`/book/collect`, `/apply/operations-coordinator`, etc.).

**Cons — real, not just theoretical:** `redirects()` entries in this
codebase's existing precedent (`/book/collect`, `/apply/operations-coordinator`)
are **not** host-scoped — they match on the raw incoming pathname only, before
middleware resolves which tenant owns the request. A bare `source: '/about'`
redirect would therefore fire for **any** tenant's domain that happens to
request literal `/about`, incorrectly sending another tenant's visitor to
nycmaid content. Doing this safely requires adding `has: [{ type: 'host',
value: 'www.thenycmaid.com' }]` (plus the apex/non-www variant) to each
entry — a pattern not currently used anywhere in this file, so it's slightly
more novel than Option A, though not large. Also changes the user-visible URL
away from the short form the visitor typed/bookmarked, which is arguably worse
UX for a "clean URL" than Option A's invisible rewrite.

## Option C — build real short-named page files (the "build the pages" alternative)

Add 8 new folders directly under `platform/src/app/site/nycmaid/` (`about/`,
`faq/`, `tips/`, `blog/`, `areas/`, `contact/`, `pricing/`, `emergency/`),
matching the pattern `reviews/`, `referral/`, `careers/` already use — either
as thin `page.tsx` files that call `redirect()` from `next/navigation` to the
long-form URL, or as full duplicate content at the short path.

**Pros:** doesn't touch `next.config.ts` at all; consistent with how
`reviews`/`referral`/`careers` are already structured (real filesystem
folders, not rewrite-dependent).
**Cons:** 8 new files to accomplish exactly what Option A does in one config
edit — no functional advantage, larger diff, more surface to maintain per
slug going forward (e.g. `blog/:slug` needs its own dynamic route file to
replicate what the existing `:slug` rewrite already does in one line). If
built as full duplicate content instead of a `redirect()`, it also creates a
genuine duplicate-content SEO problem the rewrite/redirect options avoid.

## Recommendation

Option A — it's the one-file fix that restores what the code's own comments
say this mechanism was built to do, has no collision risk, and preserves
existing backlinks/bookmarks exactly as typed. Option B is a reasonable
alternative if Jeff prefers real 301s consolidating onto canonical URLs, but
needs the host-scoping addition to be safe given this file's existing
un-scoped-redirect precedent. Option C is strictly more work for the same
outcome as A and not recommended.

Not applied — awaiting Jeff's call on A vs. B (or a decision to also clean up
the 4 already-dead-but-harmless reviews/services/referral/careers entries in
the same pass).
