# SEO Readiness Summary — Pre-Deploy Checklist (all tenant sites)

**Author:** W3 (SEO / reconcile-gate lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — a consolidated rollup/index. **Nothing here was pushed, deployed, or applied to any route, metadata, or DB.** One walkable pre-deploy SEO checklist, parallel to `Q3-readiness-index.md` (⧉ authored on the `p1-w1` branch — not present in this worktree).

**Source of truth:** the individual SEO audits this file consolidates (linked per row). Where a detail is needed, follow the link — this index does not re-derive findings, it orders them into READY / OPEN / JEFF-GATED so the SEO surface can be walked from one page.

> **⚠️ Verification scope (honesty).** Every finding below is from **static
> source-reading** of `platform/src/app/site/*` metadata + the SEO libs. Two
> classes of check were **NOT** done and are called out inline where they gate a
> fix: (1) **live-HTML/`curl`** confirmation of what the built pages actually
> emit, and (2) **`tenants.domain` DB values** (the production apex/www host per
> tenant). Flags marked **⚠ CONFIRM** cannot be filled in without those.

**Legend:** ✅ READY / clean · 🧪 CODIFIED (a regression test guards it) · ⚠️ OPEN (fix drafted, not applied) · 🔒 JEFF-GATED (needs a DB value or a prod decision) · ❌ BROKEN (live defect).

---

## TL;DR — where SEO stands for Q3

- **Metadata coverage is complete and green.** Every one of the ~22 tenant marketing sites declares a non-empty `title` + `description` and (with 2 tracked exceptions) a `metadataBase`. Codified. 🧪
- **The biggest live SEO risk is social/OG previews, not indexing.** **11 sites** ship a broken or wrong-brand OpenGraph image (5 missing asset, 6 inheriting the NYC-Maid-branded parent OG). ❌ This is the top pre-deploy SEO fix.
- **Two canonical defects are real and tracked-RED** (`nyc-mobile-salon` apex→www 301'd canonical; `the-florida-maid` + `sunnyside-clean-nyc` missing `metadataBase`). Exact fixes are written; they self-flip the guard when applied. ⚠️
- **Three flags are blocked on a DB/domain confirm** (`wash-and-fold-hoboken` clone, `nyc-classifieds` host disagreement, the apex-vs-www class on 3 domains). 🔒
- **Indexing safety is now guarded.** No tenant page emits `noindex`/`nofollow` unintentionally; the 11 intentional ones are allowlisted and no homepage is deindexed. 🧪
- **robots + sitemap + JSON-LD are structurally sound**, with one **VERIFY** (`nycmaid` ships a static `sitemap.xml`, not a `sitemap.ts`) and one redundant `robots.ts` to remove.

**Net:** nothing here blocks the deploy on its own, but **the OG-image breakage (11 sites) and the 2 tracked-RED canonical fixes should ship in the SEO wave**, and the 3 DB-gated flags need Jeff to confirm domains before they can be closed.

---

## SEO regression guards already codified (tests) 🧪

These run in the normal `vitest` suite and fail if the invariant regresses. They are the durable half of this audit.

| Guard | File | What it locks |
|---|---|---|
| Canonical / `metadataBase` consistency | [`platform/src/lib/seo-canonical-consistency.test.ts`](../platform/src/lib/seo-canonical-consistency.test.ts) | Every site sets `metadataBase`; no canonical points at a host `middleware.ts` 301-redirects. Flag 2 + Flag 5 encoded as **tracked-RED** `KNOWN_*` sets (green today, flips to fail the moment the fix lands → forces the allowlist entry to be removed). |
| Metadata completeness | [`platform/src/lib/seo-metadata-completeness.test.ts`](../platform/src/lib/seo-metadata-completeness.test.ts) | Every site declares a non-empty `title` + `description`, resolving the `content.*` indirection used by `the-florida-maid` / `sunnyside-clean-nyc`. |
| **Indexing safety (this session)** | [`platform/src/lib/seo-indexing-safety.test.ts`](../platform/src/lib/seo-indexing-safety.test.ts) | The set of pages emitting `noindex`/`nofollow` equals the 11-page intentional allowlist (new offender → fail); **no site's ROOT metadata is noindex** (homepage-deindex guard). |

APEX domain set and the 301 predicate are **derived from `src/middleware.ts`** inside the tests, so the guards can't drift from the real routing rule.

---

## The pre-deploy SEO checklist (ordered by severity)

### 1. OG / Twitter social images — ❌ TOP FIX (11 sites broken)
**Audit:** [`platform/deploy-prep/og-image-coverage-audit.md`](../platform/deploy-prep/og-image-coverage-audit.md)

- **C1 — 5 sites reference a missing asset:** `debt-service-ratio-loan`, `landscaping-in-nyc`, `stretch-ny`, `stretch-service`, `the-nyc-interior-designer` all declare `openGraph.images: ['/og-image.jpg']` but **`public/og-image.jpg` does not exist** → broken preview card. ❌
- **C2 — 6 sites inherit the wrong-brand parent OG:** `nyc-tow`, `toll-trucks-near-me`, `the-nyc-exterminator`, `the-nyc-seo`, `the-home-services-company`, `fla-dumpster-rentals` set no OG image and fall back to the root `site/opengraph-image.tsx`, which is **NYC-Maid-branded**. ⚠️ *Confirm against built HTML before fixing — inheritance is inferred from source.*
- **C3 — `wash-and-fold-hoboken`:** OG title + image are **NYC-Maid at 512×512** (wrong brand, wrong dims, cross-domain). ❌
- **Copy the good pattern:** sites with a per-site `opengraph-image.tsx` (see audit "Good — the pattern to copy") render correct 1200×630 branded cards.
- **Action:** produce a real 1200×630 branded `og-image` per affected site (or a per-site `opengraph-image.tsx`). **Owner fix, not self-applied.** Verify each with a live preview (Slack/Twitter card validator) after deploy.

### 2. Canonical / host correctness — ⚠️ 2 exact + 🔒 3 domain-gated
**Audits:** [`seo-canonical-audit.md`](./seo-canonical-audit.md), [`seo-meta-consistency-final.md`](./seo-meta-consistency-final.md) · **Fixes:** [`seo-remediation-spec.md`](./seo-remediation-spec.md)

| Flag | Site(s) | Severity | Status |
|---|---|---|---|
| **Flag 2** | `nyc-mobile-salon` | HIGH | ⚠️ **Exact fix ready, no confirm needed.** Canonical/base/OG declare bare apex `thenycmobilesalon.com`, which is NOT in `APEX_CANONICAL_DOMAINS` → middleware 301s it apex→www, so the canonical points at a redirect. Tracked-RED in the test. |
| **Flag 5** | `the-florida-maid`, `sunnyside-clean-nyc` | MED | ⚠️ **Exact fix ready, no confirm needed.** No `metadataBase` anywhere → relative subpage canonical/OG URLs resolve to `localhost:3000` at build. Tracked-RED in the test. |
| **Flag 1** | `wash-and-fold-hoboken` | HIGH | 🔒 **⚠ CONFIRM DOMAIN.** Site is a verbatim The-NYC-Maid clone (brand + canonical + OG all point at the maid brand). Real production domain must be confirmed against `tenants.domain` before the correct value can be written. |
| **Flag 3** | `nyc-classifieds` | MED–HIGH | 🔒 **⚠ CONFIRM DOMAIN + Vercel env.** Three-way host disagreement (canonical vs base vs OG); canonical is env-gated so its built value is unknowable from source. |
| **Flag 4** | `consortium-nyc`, `the-nyc-marketing-company`, `the-nyc-interior-designer` | — | 🔒 apex-vs-www canonical class (see `seo-canonical-audit.md`): 3 domains are apex-canonical in middleware but every content signal declares `www`. Needs the per-domain decision (which host is truly canonical) before fixing. |

**Action:** apply Flag 2 + Flag 5 in the SEO wave (fixes are file+line in the spec; re-anchor line numbers with `grep -n` first). Hold Flags 1/3/4 until Jeff confirms the production domains.

### 3. Metadata completeness — ✅ GREEN / 🧪 CODIFIED
Every site has a non-empty title + description. The `the-florida-maid` / `sunnyside-clean-nyc` indirection (`content.title` / `content.metaDescription`) is resolved and guarded. Nothing to fix. See guard table above.

### 4. robots.txt / sitemap.xml — ⚠️ 1 VERIFY + 1 cleanup
**Audit:** [`robots-sitemap-coverage-audit.md`](./robots-sitemap-coverage-audit.md)

- **Finding 1 (⚠ VERIFY, potentially HIGH):** `nycmaid` is in `TENANTS_WITH_RICH_SITEMAP` but has **no `sitemap.ts`** — it ships a **static `sitemap.xml`** instead. Confirm the served `/sitemap.xml` is not a 404 for the flagship tenant. **Needs a live `curl` — not verifiable from source.**
- **Finding 2 (MED):** redundant / unreachable per-site `robots.ts` for `the-nyc-marketing-company` (global header-driven robots already covers it). Remove or confirm.
- **Finding 3 (LOW):** `/join` is crawlable only on `nyc-mobile-salon`; confirm no other tenant needs it.
- Otherwise: **20/21 rich sitemaps present and correct; no orphan sitemaps.** ✅

### 5. Structured data (JSON-LD) — ✅ GREEN
**Audit:** [`structured-data-inventory.md`](./structured-data-inventory.md)

Every tenant emits JSON-LD; **100% of sinks are XSS-safe** (`safeJsonLd()` or a byte-identical inline `<` escape on the 2 sites that don't use the helper). No open item. ✅

### 6. Internal linking / orphan pages — ⚠️ conversion-page orphans
**Audit:** [`platform/deploy-prep/internal-linking-audit.md`](../platform/deploy-prep/internal-linking-audit.md)

- **Orphaned CONVERSION pages (highest value):** `the-nyc-exterminator/schedule-service` and `fla-dumpster-rentals/free-quote` are reachable by URL but not linked from anywhere → lost conversions + weak indexing signal.
- `the-nyc-seo`: 5 orphan business-category pages. `fla-dumpster-rentals`: 3 orphan landers.
- `consortium-nyc` + `the-nyc-marketing-company`: duplicate `/pricing` + `/nyc-web-design-pricing`, both unlinked.
- **Action:** add nav/footer/in-content links to the orphaned conversion pages first. Owner fix.

### 7. Indexing safety — ✅ GREEN / 🧪 CODIFIED (this session)
No tenant page is unintentionally `noindex`/`nofollow`; the 11 intentional noindex pages (thin programmatic geo/neighborhood combos + `nyc-classifieds` auth/account/messaging utility pages) are allowlisted; no homepage is deindexed. See guard table. Any new noindex page fails CI until reviewed.

---

## What is JEFF-GATED (cannot be closed from source alone) 🔒

1. **Production domain per tenant** (`tenants.domain`) — unblocks Flag 1, Flag 3, Flag 4 and confirms the correct canonical host. This is the single biggest SEO unblock.
2. **The apex-vs-www canonical decision** for the 3 apex-canonical domains — a routing/SEO policy call, not a code detail.
3. **Live-HTML confirmation** of the 6 inherited-OG sites (C2) and the `nycmaid` `/sitemap.xml` (Finding 1) — a short `curl`/preview pass once a deploy exists.

## What is READY to ship in the SEO wave (no gate)

- Flag 2 (`nyc-mobile-salon` canonical) and Flag 5 (`the-florida-maid` + `sunnyside` `metadataBase`) — exact file+line fixes in `seo-remediation-spec.md`; applying them flips the tracked-RED test entries, which is the signal to delete those entries.
- New branded 1200×630 OG assets for the 5 missing-asset sites (C1) — pure asset add, no domain dependency.
- Remove the redundant `the-nyc-marketing-company/robots.ts` (Finding 2).
- Internal links to the 2 orphaned conversion pages (§6).

## Verified vs NOT verified (honesty)

- **Verified (static):** all metadata/canonical/OG/robots/sitemap/JSON-LD source declarations; the 3 regression guards run green (`tsc --noEmit` clean; the SEO test files pass, with tracked-RED entries intentionally still red-latched inside green assertions).
- **NOT verified (out of vantage):** built-HTML output of any page; live `/sitemap.xml` / `/robots.txt` responses; the wrong-brand inheritance for the 6 C2 sites; actual `tenants.domain` values; social-card rendering. Every fix above is a **recommendation prepared as a file** — none was applied to a route, metadata, asset, or DB.
