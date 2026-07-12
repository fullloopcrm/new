# Sitemap www→apex fix — ready-to-apply plan

**SEO sign-off item. Pre-deploy, apply-ready.** The one-line-per-file edit that makes
each apex-canonical tenant's sitemap advertise its canonical (apex) host.

**Status: file-only, authored NOT applied.** This is a reviewed source change — the
diffs below are ready to paste, but W3 does not apply or deploy them. The leader/Jeff
applies after review.

**Companion docs:**
- `sitemap-www-vs-apex-detection.md` — the *post-deploy* go/no-go detector (curl each
  live domain, assert no `www.` in `<loc>`). This file is the *pre-deploy* fix it clears.
- `seo-canonical-audit.md` — Flag 4, the same www-vs-apex class at the canonical-tag layer.
- `platform/src/lib/sitemap-presence.test.ts` — the on-disk sitemap-route invariant (runs in CI).

---

## Why apex is the correct host (authoritative source)

Three tenants are served at the **bare apex**, not `www` — enumerated in
`APEX_CANONICAL_DOMAINS`, `platform/src/middleware.ts:175-179`:

```
consortiumnyc.com   ·   thenycmarketingcompany.com   ·   thenycinteriordesigner.com
```

Per the middleware comment they are ex-standalone builds migrated to FL "whose www
subdomain isn't cleanly served" (Vercel 307s www→apex, which fights the apex→www
redirect and infinite-loops). The guard `!APEX_CANONICAL_DOMAINS.has(canonicalHost)`
(`middleware.ts:187`) **skips** the apex→www redirect for these, so the app serves them
at the apex and the apex is their canonical host.

Each site's sitemap, however, hardcodes a `https://www.…` base, so every `<loc>`
advertises the **non-canonical** www host. Best case Google flags "Page with redirect"
for the whole sitemap; worst case (www never provisioned) the sitemap lists dead URLs.

---

## The fix (apply exactly — one line per file)

```diff
# platform/src/app/site/consortium-nyc/sitemap.ts:4
-const BASE = "https://www.consortiumnyc.com";
+const BASE = "https://consortiumnyc.com";
```

```diff
# platform/src/app/site/the-nyc-marketing-company/sitemap.ts:4
-const BASE = "https://www.thenycmarketingcompany.com";
+const BASE = "https://thenycmarketingcompany.com";
```

```diff
# platform/src/app/site/the-nyc-interior-designer/_lib/siteData.ts:4
-export const SITE_DOMAIN = "https://www.thenycinteriordesigner.com";
+export const SITE_DOMAIN = "https://thenycinteriordesigner.com";
```

No logic changes. The sitemap generators concatenate `BASE`/`SITE_DOMAIN` + path, so
dropping `www.` is sufficient to move every `<loc>` to the apex.

---

## ⚠ Scope & sufficiency — READ BEFORE APPLYING

**The three edits are NOT equivalent in blast radius.** The leader framing ("one-line
apex fix for the 3 sitemaps") is literally true for the sitemap `<loc>` output, but two
of the three sites have a larger www→apex inconsistency that these edits do **not** fully
resolve. Verified 2026-07-12:

### `the-nyc-interior-designer` — the edit is COMPREHENSIVE, not sitemap-only

`SITE_DOMAIN` is the site's single source of truth: it feeds the sitemap **and** every
per-page `alternates.canonical`, `og:url`, JSON-LD `@id`/breadcrumb URL across the site
(`page.tsx`, `apply/page.tsx`, `contact/page.tsx`, `areas/[borough]/[area]/page.tsx`, …).
So this one edit correctly flips **canonical tags, OpenGraph, and structured data to the
apex too** — which is exactly what apex-canonical requires, so it's a *bonus*, not a
regression. But a reviewer must know it is **not** a sitemap-only change: it changes the
canonical host advertised on every page of that site. Grep to confirm before applying:

```bash
grep -rn "SITE_DOMAIN" platform/src/app/site/the-nyc-interior-designer/ | grep -v node_modules
# Every hit moves to apex. Confirm none needs to stay www (e.g. an absolute asset URL
# hosted only on www). As of 2026-07-12 all consumers are canonical/URL uses — safe.
```

### `consortium-nyc` & `the-nyc-marketing-company` — the edit is NECESSARY BUT NOT SUFFICIENT

These two do **not** centralize their domain. The sitemap `BASE` is a *local literal*,
separate from the ~hundreds of other www references across the site:

| Site | `www.` literals OUTSIDE sitemap.ts (canonical tags, og, JSON-LD, robots.ts, layout `metadataBase`) |
|---|---|
| `consortium-nyc` | **247** |
| `the-nyc-marketing-company` | **268** |

Confirmed hotspots (`www` hardcoded, NOT touched by the sitemap edit):
- `…/consortium-nyc/layout.tsx:36,69,103` — `metadataBase`, `og:url`, **`canonical`**
- `…/the-nyc-marketing-company/layout.tsx:35,65,99` — `metadataBase`, `og:url`, **`canonical`**
- `…/the-nyc-marketing-company/robots.ts` — sitemap/host reference

**Consequence of applying the sitemap edit alone:** the sitemap `<loc>` becomes apex
while every page's `<link rel="canonical">` still says `www`. That's a **sitemap↔canonical
disagreement** — arguably a *different* SEO smell than the one being fixed. The sitemap
edit still strictly improves the sitemap (it now points at the served host), so it is
correct to apply; but for these two sites it must be understood as **step 1 of a full
www→apex migration**, not a complete fix.

**Recommendation:** apply the sitemap one-liners now (they're correct and low-risk), and
open a separate, larger task to migrate `consortium-nyc` and `the-nyc-marketing-company`
fully to apex (canonical tags, og, JSON-LD, robots.ts, `metadataBase`) — OR, if the
decision is that these two are actually intended to be **www-canonical** (which would
contradict `APEX_CANONICAL_DOMAINS` in middleware and mean the *middleware set* is the
bug, not the sitemap), then do NOT apply their sitemap edits and instead reconcile the
middleware set. That www-vs-apex canonical-host decision is above this file's pay grade —
flagging it for the leader/Jeff. `the-nyc-interior-designer` has no such ambiguity: its
single edit already makes the whole site consistently apex.

---

## Verification

### Pre-apply (source)
```bash
# 1. Confirm the three current bases are www (the defect is present).
grep -n 'https://www\.' platform/src/app/site/consortium-nyc/sitemap.ts \
  platform/src/app/site/the-nyc-marketing-company/sitemap.ts \
  platform/src/app/site/the-nyc-interior-designer/_lib/siteData.ts

# 2. interior-designer only: enumerate SITE_DOMAIN consumers (see Scope section).
grep -rn "SITE_DOMAIN" platform/src/app/site/the-nyc-interior-designer/ | grep -v node_modules
```

### Post-apply (source — run from platform/)
```bash
# tsc must stay clean (string-literal change; expected 0 errors).
cd platform && npx tsc --noEmit --pretty false

# Full suite green — sitemap-presence + all SEO guards.
npx vitest run

# The three bases are now apex (no www.):
grep -c 'https://www\.' src/app/site/consortium-nyc/sitemap.ts \
  src/app/site/the-nyc-marketing-company/sitemap.ts \
  src/app/site/the-nyc-interior-designer/_lib/siteData.ts   # each => 0
```

### Post-deploy (live)
Run the detection block in `sitemap-www-vs-apex-detection.md` against the three live
apex domains. Expect **PASS** (`<loc>` www-host = 0, apex serves 200 xml) for all three.

---

## Rollback

Revert the string literals to `https://www.…`. No data migration, no schema change, no
runtime state — the edits are pure compile-time constants.
