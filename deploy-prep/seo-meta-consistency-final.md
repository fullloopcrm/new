# SEO Meta / Title / OG / Canonical Consistency Sweep — All Tenant Domains

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** docs + static code read only (no route/metadata edits)
**Status:** findings for LEADER/Jeff to action — DO NOT self-apply metadata/route edits.
**Companion:** [`seo-canonical-audit.md`](./seo-canonical-audit.md) (apex-vs-www routing defect on 3 domains — not re-derived here).

---

## Method & honest scope

- **Static sweep** of every `src/app/site/<tenant>/` metadata source: `metadataBase`,
  `alternates.canonical`, `openGraph.url`, `openGraph.siteName`, `title`, `description`, and
  the per-site `SITE_URL` constants that feed them.
- Cross-checked host declarations against the **global apex→www 301** in `src/middleware.ts`
  (every custom domain redirects apex→`www.` EXCEPT the 3 in `APEX_CANONICAL_DOMAINS`).
- **NOT done here:** live `curl` probes of every domain (the canonical audit did that for the
  3 apex-canonical domains); exhaustive per-subpage title/description diffing across all ~5,000
  generated routes. This sweep flags **host-level and brand-level** metadata mismatches that are
  provable from code. Per-page title uniqueness is a separate audit.
- Tenant→production-domain mapping is DB-driven (`getTenantByDomain`), which I did not query
  (file-only task). The **intended** production host per tenant is read from each site's own
  `metadataBase`/canonical, which is the signal Google actually consumes.

---

## TL;DR — 5 flagged sites

| # | Site | Severity | One-line |
|---|---|---|---|
| 1 | `wash-and-fold-hoboken` | **HIGH** | Entire metadata block is **The NYC Maid** — title/desc/OG/canonical/keywords all `thenycmaid.com`; uncustomized clone. |
| 2 | `nyc-mobile-salon` | **HIGH** | Declares **apex** canonical (`thenycmobilesalon.com`) but middleware 301s apex→www → canonical points at a self-redirecting host. |
| 3 | `nyc-classifieds` | **MED–HIGH** | Three different hosts across `metadataBase` (`localhost:3000` fallback), canonical (`thenycclassifieds.com`), and `_lib/seo.ts` (`nyc-classifieds.com`). |
| 4 | `consortium-nyc`, `the-nyc-marketing-company`, `the-nyc-interior-designer` | (see companion) | www-metadata vs apex-canonical-middleware — fully covered in `seo-canonical-audit.md`. |
| 5 | `the-florida-maid`, `sunnyside-clean-nyc` | **MED** | No `metadataBase` anywhere → relative OG-image/canonical URLs resolve to `localhost` at build. |

The remaining ~20 sites are **host-coherent**: `www` metadataBase + `www` canonical + `www` OG
url, consistent with the middleware apex→www 301. Listed in §Coherent sites for completeness.

---

## Flag 1 — `wash-and-fold-hoboken` is The NYC Maid (HIGH)

`src/app/site/wash-and-fold-hoboken/layout.tsx` — **every** metadata field is The NYC Maid,
not a Hoboken wash-and-fold laundry:

```
title.default : 'The NYC Maid - Professional Cleaning Services in NYC From $59/hr'
description    : 'NYC house cleaning & maid service from $59/hr...'
metadataBase   : https://www.thenycmaid.com
openGraph.url  : https://www.thenycmaid.com
openGraph.image: https://www.thenycmaid.com/icon-512.png
openGraph.siteName / authors / publisher : The NYC Maid
alternates.canonical : https://www.thenycmaid.com   (+ languages en-US/es-US both thenycmaid.com)
keywords       : "NYC maid service", "house cleaning NYC", ...
```

**Why it matters:** if this tenant is served, every one of its pages emits The NYC Maid's title
and a canonical pointing at `www.thenycmaid.com`. Google will either (a) treat the Hoboken site
as duplicate content that self-canonicalizes to a **different brand's domain**, dropping the
Hoboken site from the index, or (b) attribute Hoboken pages to thenycmaid.com. Either way the
wash-and-fold-hoboken brand gets **zero** organic credit.

**Proof it's a clone, not intentional:** the sibling `wash-and-fold-nyc/layout.tsx` is correctly
branded (`metadataBase: https://www.washandfoldnyc.com`, canonical `washandfoldnyc.com`). Hoboken
looks like it was scaffolded from a NYC-Maid copy and the metadata never got swapped. (Consistent
with `platform/CLAUDE.md` "Known debt" note that both wash-and-fold tenants are clone-derived.)

**Action:** replace the whole metadata block with the Hoboken brand's real domain/title/OG before
this tenant goes live. **Confirm the tenant's actual production domain** (DB `tenants.domain`) first
— it is not derivable from the current file since the file lies.

---

## Flag 2 — `nyc-mobile-salon` apex canonical vs apex→www 301 (HIGH)

`nyc-mobile-salon` declares the **bare apex** as canonical everywhere:

```
layout.tsx  metadataBase : https://thenycmobilesalon.com   (no www)
layout.tsx  openGraph.url: https://thenycmobilesalon.com
page.tsx    canonical    : https://thenycmobilesalon.com
sitemap.ts / _lib/seo.ts SITE_URL : https://thenycmobilesalon.com
```

But `thenycmobilesalon.com` is **NOT** in `middleware.ts` `APEX_CANONICAL_DOMAINS`
(that set is only consortium / marketing / interior-designer). So the global rule applies:

```
GET https://thenycmobilesalon.com/  →  301  →  https://www.thenycmobilesalon.com/
```

Result: the served page's `<link rel=canonical>` points at `thenycmobilesalon.com`, which
**301-redirects to www**. Google's rule is to distrust a canonical that points at a redirecting
URL — it will most likely index `www.thenycmobilesalon.com` while every content signal (OG,
sitemap, breadcrumb) insists on the apex. This is the **exact inverse** of the consortium defect
in the companion doc, and unlike that one it is **provable from code alone** (the 301 is in
middleware, not the Vercel dashboard).

**Action (pick one, make all signals agree):**
- **(A) www-canonical:** flip metadataBase / canonical / OG url / sitemap / seo.ts to
  `https://www.thenycmobilesalon.com`. Matches the middleware 301. Least routing risk. **Recommended.**
- **(B) apex-canonical:** add `thenycmobilesalon.com` to `APEX_CANONICAL_DOMAINS` and set apex as
  Vercel primary (www→apex 308). Keeps current metadata but needs middleware + Vercel changes.

---

## Flag 3 — `nyc-classifieds` three-way host disagreement (MED–HIGH)

Three different production hosts are hardcoded across this one site:

```
layout.tsx  metadataBase : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
layout.tsx  canonical    : process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'
_lib/seo.ts SITE_URL     : 'https://nyc-classifieds.com'
openGraph.siteName       : 'The NYC Classifieds'
```

Two independent problems:

1. **`metadataBase` falls back to `http://localhost:3000`.** If `NEXT_PUBLIC_SITE_URL` is not set
   at **build** time (Next inlines `NEXT_PUBLIC_*` at build, not runtime), every relative OG-image
   and metadata URL resolves to `http://localhost:3000` in production. The canonical fallback is a
   real domain but metadataBase's is localhost — they don't even share a fallback.
2. **Two different apex hosts** are hardcoded as fallbacks: canonical → `thenycclassifieds.com`,
   but `_lib/seo.ts` (which feeds JSON-LD `url`/`WebSite`/sitemap) → `nyc-classifieds.com`. Even
   when the env var IS set, JSON-LD emitted from `seo.ts` will name `nyc-classifieds.com` while the
   `<link rel=canonical>` names whatever the env var is. Google gets conflicting site URLs.

**Action:** decide the ONE production host, set `NEXT_PUBLIC_SITE_URL` in the Vercel env for this
project, and make the `seo.ts` `SITE_URL` and both layout fallbacks use that same host. Remove the
`localhost:3000` fallback (replace with the real domain so a missing env var fails safe, not to
localhost). Note this apex host is also NOT in `APEX_CANONICAL_DOMAINS`, so Flag-2's apex→www 301
trap applies unless the chosen host is `www.`.

---

## Flag 4 — apex-vs-www on 3 domains → see companion

`consortium-nyc`, `the-nyc-marketing-company`, `the-nyc-interior-designer` declare **www** in all
metadata while `middleware.ts` treats them as **apex-canonical** (excluded from apex→www 301).
Fully documented — evidence, live probes, and both fix options — in
[`seo-canonical-audit.md`](./seo-canonical-audit.md). Not duplicated here. Same defect class as
Flag 2 but the redirect direction is set in the Vercel dashboard (not code), so it needs live
confirmation before choosing a fix.

---

## Flag 5 — missing `metadataBase` (MED)

`the-florida-maid` and `sunnyside-clean-nyc` define **no** `metadataBase` in layout **or** page:

- `the-florida-maid` — metadata lives in `page.tsx` with **absolute** canonical/OG url
  (`https://www.thefloridamaid.com`), so the **root** page is fine. But any subpage that emits a
  **relative** `alternates.canonical` or a relative OG image will resolve against Next's default
  `metadataBase` = `http://localhost:3000` (with a build-time warning). Note: `thefloridamaid.com`
  IS in the middleware static tenant map and is apex→www 301'd, so `www` metadata is host-coherent
  — the only defect is the missing base.
- `sunnyside-clean-nyc` — same: `page.tsx` uses absolute `https://www.cleaningservicesunnysideny.com`
  for root canonical/OG, no `metadataBase`. (JSON-LD is safe — via shared `@/components/marketing/JsonLd`.)

**Action:** add `metadataBase: new URL('https://www.thefloridamaid.com')` and
`metadataBase: new URL('https://www.cleaningservicesunnysideny.com')` to each site's `layout.tsx`
so relative metadata resolves to the real host. Low effort, low risk.

---

## Coherent sites (no host/brand mismatch found)

`www` metadataBase + `www` canonical + `www` OG url, consistent with the middleware apex→www 301:

`toll-trucks-near-me`, `theroadsidehelper`, `stretch-service`, `stretch-ny`, `we-pay-you-junk`,
`landscaping-in-nyc`, `nyc-tow`, `debt-service-ratio-loan`, `nycroadsideemergencyassistance`,
`the-home-services-company`, `the-nyc-seo`, `the-nyc-exterminator`, `fla-dumpster-rentals`,
`wash-and-fold-nyc`, `the-florida-maid` (host-coherent; missing base — Flag 5).

The NYC Maid apex cluster (`nycmaid` + the many `nyc-maid-*` / `contact-*` / `reviews` / `service-*`
content dirs) all canonicalize to `https://www.thenycmaid.com` — coherent.

`template` is config-driven (`config.identity.url`) — correct by construction; per-tenant host comes
from the tenant row, so no static mismatch possible.

---

## Verification performed

- Static read of `metadataBase`, `alternates.canonical`, `openGraph.url/siteName`, `title`,
  `description`, and `SITE_URL` constants across all `src/app/site/*` layouts and root pages.
- Cross-check against `src/middleware.ts` apex→www 301 block + `APEX_CANONICAL_DOMAINS`.
- Full read of `wash-and-fold-hoboken/layout.tsx` and `nyc-classifieds/layout.tsx`.

## NOT verified (out of vantage / scope)

- Live HTTP responses / served `<link rel=canonical>` for the sites flagged here (companion doc
  covers the 3 apex-canonical domains live).
- Per-subpage title/description uniqueness across generated routes.
- Actual `tenants.domain` DB values (file-only task) — confirm before acting on Flags 1 and 3.
- No metadata or route edits were made (docs-only task).
