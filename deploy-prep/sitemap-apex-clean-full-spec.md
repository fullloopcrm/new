# Apex-clean full edit enumeration — the 3 apex-canonical tenants

**SEO sign-off, pre-deploy, SPEC ONLY — authored NOT applied.** W3 does not apply or
deploy any of this. The leader/Jeff applies after review.

This is the **completion** of `sitemap-apex-fix-plan.md`. That doc flagged the sitemap
one-liners as **necessary but not sufficient** — the sitemap `<loc>` flips to apex while
the rest of each site's SEO surface (canonical tags, og:url, `metadataBase`, JSON-LD,
robots) stays `www`, producing a sitemap↔canonical split-brain. This doc enumerates the
**FULL set of edits per tenant** required for a deploy to land **apex-clean** (every
self-referential URL on the served host = the canonical apex host).

**Companion docs:** `sitemap-apex-fix-plan.md` (the one-liner sitemap-only step),
`seo-canonical-audit.md` (Flag 4, canonical-tag layer), `sitemap-www-vs-apex-detection.md`
(post-deploy live detector), `platform/src/lib/seo-sitemap-canonical-host.test.ts`
(CI guard that fails on exactly the split-brain a partial apply leaves behind).

---

## Correction to prior counts (re-verified 2026-07-12)

`sitemap-apex-fix-plan.md` cited **247 / 268** www literals for consortium-nyc /
marketing-company. Re-grepping the tenant trees today gives different numbers — the
authoritative, current counts are below. The 247 figure is stale (likely a broader
`www\.` pattern or a pre-refactor snapshot); **use these:**

| Tenant | www literals in `src/app/site/<tenant>/` | Files | Centralized? | Per-tenant `robots.ts`? |
|---|---|---|---|---|
| `the-nyc-interior-designer` | **11** | 5 | **Yes** (const-based) | No (only `sitemap.ts`) |
| `consortium-nyc` | **149** | 36 | **No** (raw literals) | **No** (uses central robots) |
| `the-nyc-marketing-company` | **269** | ~85 | **No** (raw literals) | **Yes** (`robots.ts:12`) |

Grep to reproduce each count (run from `platform/`):
```bash
grep -rn "www\.thenycinteriordesigner\.com" src/app/site/the-nyc-interior-designer/  | wc -l   # 11
grep -rn "www\.consortiumnyc\.com"          src/app/site/consortium-nyc/             | wc -l   # 149
grep -rn "www\.thenycmarketingcompany\.com" src/app/site/the-nyc-marketing-company/  | wc -l   # 269
```

---

## The transform (identical for all three)

Every www literal is **self-referential** (the tenant's own domain in a canonical tag,
og:url, `metadataBase`, JSON-LD `@id`/`url`/`image`, robots sitemap URL, sitemap base,
body-copy link, or email-template link). None point at a *different* site. So the
apex-clean fix is one mechanical string replacement per tenant, applied across the whole
tenant tree:

```
https://www.<tenant-domain>   →   https://<tenant-domain>
```

No logic changes; these are all compile-time string constants / literals. Dropping `www.`
moves every self-URL to the served (apex) host.

**DO NOT APPLY — reference commands for the leader (dry-run first):**
```bash
# From platform/. --- DRY RUN (shows every line that would change) ---
grep -rln "www\.consortiumnyc\.com" src/app/site/consortium-nyc/
# --- APPLY (leader only, after review) ---
# LC_ALL=C find src/app/site/consortium-nyc -type f \
#   -exec sed -i '' 's#https://www\.consortiumnyc\.com#https://consortiumnyc.com#g' {} +
# Repeat with thenycmarketingcompany.com and thenycinteriordesigner.com in their dirs.
```
A blind tree-wide `sed` is acceptable here **only because** every match is self-referential
(verified below). Confirm the "no legit www should stay" check in Verification before applying.

---

## Tenant 1 — `the-nyc-interior-designer` (11 literals, 5 files — tractable, edit-by-const)

Centralized: `sitemap.ts` imports `SITE_DOMAIN` from `_lib/siteData.ts`, and sub-page
metadata (canonical/og/JSON-LD) derives from `SITE_DOMAIN` / `_lib/schema.tsx` `DOMAIN`.
Editing the two consts flips the sitemap + all sub-pages. The homepage `layout.tsx` and
two `_lib` files hold the remaining literals. Full list:

| File:line | Role | Edit |
|---|---|---|
| `_lib/siteData.ts:4` | `SITE_DOMAIN` — feeds sitemap + all sub-page canonical/og/JSON-LD | drop `www.` |
| `_lib/schema.tsx:2` | `DOMAIN` const — JSON-LD `@id`/`url`/`image` | drop `www.` |
| `_lib/settings.ts:38` | `business_website` | drop `www.` |
| `layout.tsx:33` | homepage `metadataBase` | drop `www.` |
| `layout.tsx:63` | homepage `og:url` | drop `www.` |
| `layout.tsx:96` | **homepage `canonical`** (the split-brain straggler) | drop `www.` |
| `_lib/email-templates.ts:146,165,324,385,458` | email body links (5) | drop `www.` |

`sitemap.ts` needs **no direct edit** — it consumes `SITE_DOMAIN`. No `robots.ts` exists
for this tenant.

---

## Tenant 2 — `consortium-nyc` (149 literals, 36 files — NOT centralized)

No `robots.ts` (this tenant's robots is served centrally, not per-tenant — nothing to edit
here, but confirm the central robots advertises the apex sitemap URL, see note below).
The domain is **not** centralized, so every page hardcodes its own canonical/og. The
SEO-critical must-flip files (a partial apply that misses any of these re-creates the
split-brain the CI guard catches):

| File:line | Role |
|---|---|
| `sitemap.ts:4` | sitemap `BASE` |
| `layout.tsx:36` | homepage `metadataBase` |
| `layout.tsx:69` | homepage `og:url` |
| `layout.tsx:103` | **homepage `canonical`** |
| `_lib/schema.tsx` (21 literals) | JSON-LD org/website/service/localbusiness `@id`/`url`/`image` |

**Full edit surface (all 36 files):** every file below has ≥1 self-www literal; the
mechanical replace must cover all of them. Counts in brackets.

```
[3] layout.tsx            [3] page.tsx              [1] sitemap.ts
[21] _lib/schema.tsx
[5] contact-nyc-marketing-company-consortium-nyc/page.tsx
[5] contact/page.tsx      [2] nyc-marketing-company-services-list/page.tsx
[4] nyc-marketing-company-faqs/page.tsx
[2] services-areas-we-offer-marketing-services-in/page.tsx
[5] services-areas-we-offer-marketing-services-in/[slug]/page.tsx
[4] terms/page.tsx        [2] master-marketing-checklist-last-updated-2026/page.tsx
[4] privacy-policy/page.tsx  [2] about/page.tsx    [3] about/AboutClient.tsx
[4] results/page.tsx      [2] the-free-human+ai-seo-marketing-review/page.tsx
[2] annual-marketing-spend-roi-calculator/page.tsx
[2] nyc-marketing-pricing-guide/page.tsx  [4] nyc-web-design-pricing/page.tsx
[5] artificial-intelligence-marketing-services-offered/page.tsx
[4] the-marketing-blog/page.tsx
[5] the-marketing-blog/local-seo-vs-national-seo/page.tsx
[5] the-marketing-blog/how-to-choose-digital-marketing-agency/page.tsx
[5] the-marketing-blog/10-seo-mistakes-nyc-businesses-2026/page.tsx
[2] nyc-marketing-company-portfolio/page.tsx  [2] whats-working-in-marketing/page.tsx
[4] nyc-marketing-101-guide/page.tsx  [4] accessibility/page.tsx
[2] services/page.tsx     [3] services/ServicesClient.tsx  [4] pricing/page.tsx
[2] industries-we-offer-marketing-services-for/page.tsx
[6] services/[slug]/page.tsx  [6] services/[slug]/[area]/page.tsx
[4] industries-we-offer-marketing-services-for/[slug]/page.tsx
[6] industries-we-offer-marketing-services-for/[slug]/[service]/[area]/page.tsx
```

---

## Tenant 3 — `the-nyc-marketing-company` (269 literals, ~85 files — NOT centralized)

Has a per-tenant `robots.ts` — **must flip** or robots advertises the www sitemap while
the sitemap serves apex. SEO-critical must-flip files:

| File:line | Role |
|---|---|
| `sitemap.ts:4` | sitemap `BASE` |
| `robots.ts:12` | `sitemap: ["https://www.thenycmarketingcompany.com/sitemap.xml"]` |
| `layout.tsx:35` | homepage `metadataBase` |
| `layout.tsx:65` | homepage `og:url` |
| `layout.tsx:99` | **homepage `canonical`** |
| `_lib/schema.tsx` (21 literals) | JSON-LD `@id`/`url`/`image` |

**Full edit surface (~85 files):** largest tree — the mechanical replace covers the whole
`src/app/site/the-nyc-marketing-company/` directory. Beyond the SEO-critical set above, it
includes `_components/**` (Navbar, Footer, all `home/*` sections, `blog/BlogSidebar`),
every `*/page.tsx` and `*Client.tsx`, `_lib/serviceContent.tsx`, and
`contact/ContactPageClient.tsx`. Enumerate at apply time with:
```bash
grep -rln "www\.thenycmarketingcompany\.com" src/app/site/the-nyc-marketing-company/
```
(Full per-file list is deterministic from that grep — ~85 files, 269 lines. Not pasted in
full here because the mechanical tree-wide replace covers them identically; the grep is the
source of truth at apply time.)

---

## Out-of-tenant backlinks — SHOULD flip, but NOT part of the tenant's own SEO surface

Re-verified 2026-07-12: three FullLoop-app files link **to** the apex domains from
*outside* the tenant trees (cross-site "built by / powered by" backlinks). These do **not**
cause the sitemap↔canonical split-brain (they aren't the apex tenant's own canonical/og/
sitemap), and they still resolve (www 307→apex per middleware). For a zero-redirect-hop,
fully apex-clean estate they should also flip, but treat them as a **separate, optional**
cleanup — do NOT bundle them into the tenant apex migration:

| File:line | Links to |
|---|---|
| `src/components/marketing/MarketingFooter.tsx:124` | `https://www.consortiumnyc.com/` |
| `src/components/Footer.tsx:134`, `:251` | `https://www.thenycmarketingcompany.com/` |
| `src/app/(marketing)/about-full-loop-crm/page.tsx:214` | `https://www.thenycmarketingcompany.com/` |

`the-nyc-interior-designer` has **no** such external backlinks (grep returns nothing).

**Central robots note:** `consortium-nyc` has no per-tenant `robots.ts`, so its robots/
sitemap advertisement comes from a central handler (e.g. `/api/tenant-sitemap` fallback or
a shared robots route). Confirm that central handler emits the **apex** sitemap URL for
consortium before sign-off — it is not covered by the tenant-tree `sed`.

---

## The www-vs-apex decision this spec assumes (leader/Jeff must ratify)

This spec assumes the **apex** host is canonical for all three, per
`APEX_CANONICAL_DOMAINS` in `platform/src/middleware.ts:175-179`. That is the authoritative
signal: the middleware **skips** the apex→www redirect for exactly these three, so the app
serves them at the apex. If the intent is instead that any of these should be **www-**
canonical, then the *middleware set* is the bug (not the sitemaps), and that tenant's
apex-clean edits should NOT be applied — reconcile the middleware set instead. Flagging
for ratification; this file does not decide it.

---

## Verification (all pre-apply / post-apply on source — no deploy)

```bash
cd platform

# PRE-APPLY — defect present (each domain still has www literals):
grep -rc "www\.consortiumnyc\.com"          src/app/site/consortium-nyc/            | awk -F: '{s+=$2} END{print s}'   # 149
grep -rc "www\.thenycmarketingcompany\.com" src/app/site/the-nyc-marketing-company/ | awk -F: '{s+=$2} END{print s}'   # 269
grep -rc "www\.thenycinteriordesigner\.com" src/app/site/the-nyc-interior-designer/ | awk -F: '{s+=$2} END{print s}'   # 11

# "no legit www should stay" — confirm every match is self-referential (own domain),
# not an external link to some other www.* site. Eyeball this list before sed:
grep -rn "https://www\." src/app/site/consortium-nyc/ src/app/site/the-nyc-marketing-company/ \
  src/app/site/the-nyc-interior-designer/ | grep -v -E "consortiumnyc|thenycmarketingcompany|thenycinteriordesigner"
#   ^ expect ZERO rows. Any row = an external www.* link that must be EXCLUDED from the sed.

# POST-APPLY — clean (all three counts => 0):
grep -rc "www\.consortiumnyc\.com"          src/app/site/consortium-nyc/            | awk -F: '{s+=$2} END{print s}'   # 0
grep -rc "www\.thenycmarketingcompany\.com" src/app/site/the-nyc-marketing-company/ | awk -F: '{s+=$2} END{print s}'   # 0
grep -rc "www\.thenycinteriordesigner\.com" src/app/site/the-nyc-interior-designer/ | awk -F: '{s+=$2} END{print s}'   # 0

# tsc + full vitest must stay green (pure string change; expected 0 errors, all pass):
npx tsc --noEmit --pretty false
npx vitest run
```

**Post-deploy (live):** run the detector in `sitemap-www-vs-apex-detection.md` against the
three apex domains — expect no `www.` in any `<loc>`, and each `<link rel="canonical">`,
og:url, and robots sitemap URL on the served host resolving to apex with no 307 hop.

## Rollback

Revert the string literals (`git revert`/`git checkout` the tenant tree). Pure compile-time
constants — no schema, no data migration, no runtime state.
