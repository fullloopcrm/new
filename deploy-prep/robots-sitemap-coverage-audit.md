# Robots.txt / Sitemap.xml Coverage Audit — All Tenant Sites

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** static code read only (no route/config edits)
**Status:** findings for LEADER/Jeff to action — DO NOT self-apply route/config edits.
**Companions:** [`seo-meta-consistency-final.md`](./seo-meta-consistency-final.md), [`seo-remediation-spec.md`](./seo-remediation-spec.md)

All paths relative to `platform/`. Line numbers as of this commit — re-anchor with `grep -n` before editing.

---

## How robots + sitemap are served (architecture)

Both are **global, header-driven** — one generator, per-tenant output — consistent with the platform's
GLOBAL rule. Custom-domain / subdomain requests are routed in `src/middleware.ts`:

- **`/robots.txt`** → `src/middleware.ts:331-337` injects signed tenant headers and calls
  `NextResponse.next()`, letting the **global** generator `src/app/robots.ts` run. That generator reads the
  `Host` header (`src/app/robots.ts:7-9`) and emits a robots.txt whose `Sitemap:` line and allow/disallow
  rules are scoped to the requesting host. **One file serves every tenant.**
- **`/sitemap.xml`** → `src/middleware.ts:313-327`. If the tenant slug is in
  `TENANTS_WITH_RICH_SITEMAP` (`middleware.ts:312`), the request is rewritten to
  `/site/<slug>/sitemap.xml` (that tenant's own `sitemap.ts`). Otherwise it falls back to the generic
  `/api/tenant-sitemap?slug=<slug>` (a 7-URL default).

The global robots generator's disallow list (`src/app/robots.ts:26-63`) is solid: it blocks
`/dashboard/`, `/admin/`, `/api/`, `/team/`, `/portal/`, `/sign-in/`, `/sign-up/`, `/onboarding/`,
`/unsubscribe`, `/stripe-onboard/` on every host; `/join/` everywhere **except** the mobile-salon hosts
(public hiring funnel); and `/apply` on the main host only. No private surface is left crawlable.

---

## Coverage matrix — `TENANTS_WITH_RICH_SITEMAP` vs actual sitemap files

`TENANTS_WITH_RICH_SITEMAP` has **21** slugs. **20** of them have a matching `src/app/site/<slug>/sitemap.ts`.
The one asymmetry is **`nycmaid`** (see Finding 1).

| Rich-sitemap tenant | `sitemap.ts` present? | Serves at `/site/<slug>/sitemap.xml`? |
|---|---|---|
| the-nyc-exterminator, the-florida-maid, nyc-mobile-salon, the-nyc-seo, consortium-nyc, the-nyc-marketing-company, nyc-tow, theroadsidehelper, toll-trucks-near-me, we-pay-you-junk, the-home-services-company, nycroadsideemergencyassistance, fla-dumpster-rentals, landscaping-in-nyc, the-nyc-interior-designer, debt-service-ratio-loan, stretch-ny, stretch-service, sunnyside-clean-nyc, wash-and-fold-nyc (20) | ✅ `sitemap.ts` | ✅ generated |
| **nycmaid** | ⚠ **no `sitemap.ts`** — has a **static `sitemap.xml`** file instead | ⚠ **VERIFY** (Finding 1) |

**No orphans:** every `sitemap.ts` on disk is listed in `TENANTS_WITH_RICH_SITEMAP` — no tenant ships a
rich sitemap that middleware silently downgrades to the generic fallback.

**Generic-fallback tenants (not in the rich set → `/api/tenant-sitemap`, 7 URLs):** notably
`wash-and-fold-hoboken` (routed at `middleware.ts:413`, no `sitemap.ts`) and `nyc-classifieds` (scaffold).
Acceptable for now (both are pre-launch / clone-derived), but flagged so it's a conscious choice, not a gap.

---

## Findings

### Finding 1 — `nycmaid` is in the rich set but has no `sitemap.ts` (⚠ VERIFY, potentially HIGH)

`middleware.ts:312` lists `nycmaid` in `TENANTS_WITH_RICH_SITEMAP`, so a request to
`https://www.thenycmaid.com/sitemap.xml` is rewritten to `/site/nycmaid/sitemap.xml`. But `nycmaid` has
**no `sitemap.ts`** — only a **static** `src/app/site/nycmaid/sitemap.xml` file.

- **Why it matters:** the App Router generates `/…/sitemap.xml` from a `sitemap.ts` route file. A static
  `sitemap.xml` placed in a *nested* route segment is only served if Next treats it as a static metadata
  file at that segment. If it does **not**, `/site/nycmaid/sitemap.xml` **404s** — and nycmaid is the
  flagship maid site, so a 404 sitemap on the highest-traffic domain is a real indexing hit.
- **NOT verified here** (file-only, no build/curl). This must be confirmed with a live/build check:
  ```bash
  # after a production build, from the nycmaid host:
  curl -sI https://www.thenycmaid.com/sitemap.xml        # expect 200 + application/xml
  curl -s  https://www.thenycmaid.com/sitemap.xml | head  # expect <urlset>, not a 404 page
  ```
- **If it 404s — two fixes:** (a) convert the static file to a `src/app/site/nycmaid/sitemap.ts` route
  (matches the other 20 tenants), or (b) drop `nycmaid` from `TENANTS_WITH_RICH_SITEMAP` so it uses the
  generic `/api/tenant-sitemap` fallback. (a) is preferred — nycmaid has the largest route tree and the
  7-URL fallback would under-index it badly.

### Finding 2 — redundant / unreachable per-site `robots.ts` for `the-nyc-marketing-company` (MED)

`src/app/site/the-nyc-marketing-company/robots.ts` is a **second** robots generator (only this one tenant
has one). It is **not reached** by `/robots.txt` — middleware routes that path to the global
`src/app/robots.ts` (`middleware.ts:331`). It would only be hit at `/site/the-nyc-marketing-company/robots.txt`,
which is not a public tenant path. So today it is effectively **dead code**. Two latent problems if it ever
*were* served:

1. **Weak disallow.** It blocks only `/api/` (`robots.ts:9`), omitting `/dashboard/`, `/admin/`, `/team/`,
   etc. — it would expose private surfaces the global generator correctly blocks.
2. **Host mismatch.** Its sitemap points to `https://www.thenycmarketingcompany.com/sitemap.xml`
   (`robots.ts:12`), but `the-nyc-marketing-company` is **apex-canonical** in middleware
   (`APEX_CANONICAL_DOMAINS`, `middleware.ts:175-179`) — i.e. served at the bare apex, not `www`. Same
   www-vs-apex defect class as SEO Flag 4.

**Action:** delete `src/app/site/the-nyc-marketing-company/robots.ts` (the global generator already covers
it correctly), **or** confirm a deliberate reason it exists. Either way it should not diverge from the
global robots contract.

### Finding 3 — `/join` crawlability is mobile-salon-only; confirm no other tenant needs it (LOW)

`src/app/robots.ts:44-50` keeps `/join/*` crawlable **only** for `thenycmobilesalon.com` (+ `www`), where
it's the public hiring funnel with `JobPosting` structured data. Every other host blocks `/join/`. If any
other tenant (e.g. florida, sunnyside, the roadside/tow brands) also serves a public `/join` or `/apply`
hiring funnel that should be indexed, it's currently **blocked**. Worth a one-line confirm against the
tenants that ran standalone hiring pages pre-cutover. (`/apply` is already kept crawlable on tenant hosts —
only blocked on the main host, `robots.ts:57-61` — so that funnel is fine.)

---

## Coverage summary

| Surface | Mechanism | Status |
|---|---|---|
| `/robots.txt` (all tenants) | Global `src/app/robots.ts`, host-aware | ✅ Correct, private surfaces blocked |
| `/sitemap.xml` — 20 rich tenants | Own `sitemap.ts` → `/site/<slug>/sitemap.xml` | ✅ Serves |
| `/sitemap.xml` — `nycmaid` | Static `sitemap.xml`, no `sitemap.ts` | ⚠ VERIFY (Finding 1) |
| `/sitemap.xml` — all other tenants | `/api/tenant-sitemap` (7-URL generic) | ✅ Fallback works; thin coverage by design |
| Per-site `robots.ts` (marketing-company) | Unreachable duplicate | ⚠ Remove / confirm (Finding 2) |
| `/join` indexing | Crawlable on mobile-salon only | ℹ Confirm no other tenant needs it (Finding 3) |

---

## Verification performed

- Read `src/middleware.ts` `/robots.txt` + `/sitemap.xml` routing (`:313-338`) and
  `TENANTS_WITH_RICH_SITEMAP` (`:312`).
- Read global `src/app/robots.ts` (host logic + disallow list) and `src/app/sitemap.ts` (main-host
  generator).
- Enumerated every `src/app/site/*/sitemap.ts` and `*/robots.ts` on disk; diffed the sitemap set against
  `TENANTS_WITH_RICH_SITEMAP`.

## NOT verified (out of vantage / scope)

- **Live HTTP** for any `/sitemap.xml` or `/robots.txt` — including the `nycmaid` static-file question in
  Finding 1 (needs a production build + `curl`).
- Actual `tenants.domain` / tenant status values (DB, file-only task) — the "which tenants are live"
  question that determines whether the generic-fallback tenants matter yet.
- Contents of the 20 rich `sitemap.ts` files for per-URL correctness (this audit covers presence/routing,
  not per-entry accuracy).
- No route or config edits were made (docs-only task).
