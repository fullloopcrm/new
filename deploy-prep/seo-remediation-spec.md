# SEO Remediation Spec — Exact, Reviewable Fixes

**Author:** W3 · **Date:** 2026-07-12 · **Status:** ready-for-reviewed-fix (NOT self-applied)
**Source of findings:** [`seo-meta-consistency-final.md`](./seo-meta-consistency-final.md) · companion [`seo-canonical-audit.md`](./seo-canonical-audit.md)
**Regression guard:** [`platform/src/lib/seo-canonical-consistency.test.ts`](../platform/src/lib/seo-canonical-consistency.test.ts) codifies Flag 2 + Flag 5 as tracked-RED.

All paths below are relative to `platform/`. Line numbers are as of this commit — re-anchor with a
`grep -n` before editing; the sites are live code and may have shifted. **No metadata/route edits were
applied by this doc.** Two flags (1, 3) need the real production domain confirmed against
`tenants.domain` in the DB before the value can be filled in — those are marked **⚠ CONFIRM DOMAIN**.

---

## Flag 2 — `nyc-mobile-salon` apex canonical vs apex→www 301 (HIGH) — **exact, no confirmation needed**

The site declares the **bare apex** `thenycmobilesalon.com` as canonical/base/OG/sitemap, but that host
is **not** in `middleware.ts` `APEX_CANONICAL_DOMAINS`, so `src/middleware.ts:180-200` 301-redirects it
apex→`www.`. Every canonical/OG signal therefore points at a self-redirecting URL. **Recommended fix =
Option A (www-canonical)** — flip all six hardcoded hosts to `www.`; no middleware/Vercel change, matches
the existing 301. `hey@thenycmobilesalon.com` email addresses are unaffected — do NOT touch them.

| # | File | Line | Before | After |
|---|------|------|--------|-------|
| 2.1 | `src/app/site/nyc-mobile-salon/layout.tsx` | 19 | `metadataBase: new URL("https://thenycmobilesalon.com"),` | `metadataBase: new URL("https://www.thenycmobilesalon.com"),` |
| 2.2 | `src/app/site/nyc-mobile-salon/layout.tsx` | 34 | `url: "https://thenycmobilesalon.com",` | `url: "https://www.thenycmobilesalon.com",` |
| 2.3 | `src/app/site/nyc-mobile-salon/page.tsx` | 42 | `url: "https://thenycmobilesalon.com",` | `url: "https://www.thenycmobilesalon.com",` |
| 2.4 | `src/app/site/nyc-mobile-salon/page.tsx` | 45 | `canonical: "https://thenycmobilesalon.com",` | `canonical: "https://www.thenycmobilesalon.com",` |
| 2.5 | `src/app/site/nyc-mobile-salon/page.tsx` | 202 | `url: "https://thenycmobilesalon.com",` (JSON-LD node `url`) | `url: "https://www.thenycmobilesalon.com",` |
| 2.6 | `src/app/site/nyc-mobile-salon/page.tsx` | 203 | `isPartOf: { "@type": "WebSite", name: "The NYC Mobile Salon", url: "https://thenycmobilesalon.com" },` | …`url: "https://www.thenycmobilesalon.com" },` |
| 2.7 | `src/app/site/nyc-mobile-salon/sitemap.ts` | 17 | `const SITE_URL = "https://thenycmobilesalon.com";` | `const SITE_URL = "https://www.thenycmobilesalon.com";` |
| 2.8 | `src/app/site/nyc-mobile-salon/_lib/seo.ts` | 4 | `const SITE_URL = "https://thenycmobilesalon.com";` | `const SITE_URL = "https://www.thenycmobilesalon.com";` |

**Note — robots.ts coupling:** `src/app/robots.ts` `JOIN_CRAWLABLE_HOSTS` already lists BOTH
`thenycmobilesalon.com` and `www.thenycmobilesalon.com`, so `/join/*` stays crawlable after the flip. No
robots change needed.

**Verify after fix (must be clean):**
```bash
grep -rn "https://thenycmobilesalon.com" src/app/site/nyc-mobile-salon/   # expect 0 metadata/canonical hits
                                                                          # (email hey@… is a different string, unaffected)
npx tsc --noEmit
```
When applied, the regression test's tracked-RED entry for `nyc-mobile-salon` flips to failing — that is the
signal to remove it from `KNOWN_CANONICAL_REDIRECT` and let it be guarded as a normal coherent site.

**Alternative — Option B (apex-canonical):** add `'thenycmobilesalon.com'` to
`APEX_CANONICAL_DOMAINS` in `src/middleware.ts:175-179` **and** set the apex as Vercel primary (www→apex
308). Keeps current metadata but needs a middleware edit + a Vercel dashboard change + live confirmation.
Only choose this if the apex is already the intended primary for other reasons.

---

## Flag 5 — `the-florida-maid` + `sunnyside-clean-nyc` missing `metadataBase` (MED) — **exact, no confirmation needed**

Both sites define metadata only in `page.tsx` with **absolute** root canonical/OG URLs, and **no**
`metadataBase` anywhere. Their `layout.tsx` is a plain component with no `metadata` export, so any subpage
that emits a **relative** canonical or OG image resolves against Next's default base
`http://localhost:3000` at build (with a build-time warning). Root pages are fine; subpages are the risk.

**Fix at the layout level** (not page level) so the base is inherited by *every* child route in one edit —
this is the proper fix for the subpage concern, and is why the spec targets `layout.tsx` rather than only
patching the root `page.tsx`. Both hosts are `www.` and are apex→www 301'd by middleware (florida is also
in the `STATIC_TENANT_MAP`), so `www.` is host-coherent.

### 5.1 `src/app/site/the-florida-maid/layout.tsx`
Current L1-2 (no `Metadata` import, no `metadata` export):
```ts
import Script from 'next/script'
import { Bebas_Neue, Inter } from 'next/font/google'
```
Change to (add the import + a `metadata` export above the component at L10):
```ts
import type { Metadata } from 'next'
import Script from 'next/script'
import { Bebas_Neue, Inter } from 'next/font/google'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.thefloridamaid.com'),
}
```
(`page.tsx` keeps its own absolute canonical/OG — those override and are unaffected; this only supplies a
base for relative child URLs.)

### 5.2 `src/app/site/sunnyside-clean-nyc/layout.tsx`
Same shape, different host:
```ts
import type { Metadata } from 'next'
import { Bebas_Neue, Inter } from 'next/font/google'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.cleaningservicesunnysideny.com'),
}
```
(insert after the existing font imports, before `MarketingNav`/`MarketingFooter` imports at L6.)

**Verify after fix:**
```bash
grep -n "metadataBase" src/app/site/the-florida-maid/layout.tsx src/app/site/sunnyside-clean-nyc/layout.tsx
npx tsc --noEmit
```
When applied, the regression test's tracked-RED entries for these two flip to failing — remove them from
`KNOWN_MISSING_BASE` so they are guarded as normal sites going forward.

---

## Flag 1 — `wash-and-fold-hoboken` is a verbatim The-NYC-Maid clone (HIGH) — **⚠ CONFIRM DOMAIN**

`src/app/site/wash-and-fold-hoboken/layout.tsx` — **every** metadata field is The NYC Maid, not a Hoboken
wash-and-fold laundry. This is a scaffold clone whose metadata was never swapped (sibling
`wash-and-fold-nyc/layout.tsx` is correctly branded — use it as the *shape* template). The tenant's real
production domain is **not derivable from the file** (the file lies) and is **not** in `middleware.ts`
`STATIC_TENANT_MAP` — **confirm `tenants.domain` for slug `wash-and-fold-hoboken` in the DB first.** Use
the `www.` form of that domain as `<HOST>` below (so the apex→www 301 stays coherent), and the real Hoboken
brand name as `<BRAND>`.

Every line in the metadata block that must change (all currently The-NYC-Maid):

| # | Line | Field | Current (NYC Maid) | Replace with |
|---|------|-------|--------------------|--------------|
| 1.1 | 6 | `title.template` | `'%s \| The NYC Maid'` | `'%s \| <BRAND>'` |
| 1.2 | 7 | `title.default` | `'The NYC Maid - Professional Cleaning Services…'` | Hoboken wash-and-fold headline |
| 1.3 | 10 | `description` | NYC maid copy | Hoboken wash-and-fold copy |
| 1.4 | 11 | `metadataBase` | `new URL('https://www.thenycmaid.com')` | `new URL('https://<HOST>')` |
| 1.5 | 13 | `applicationName` | `'The NYC Maid'` | `'<BRAND>'` |
| 1.6 | 14 | `authors` | `{ name: 'The NYC Maid', url: 'https://www.thenycmaid.com' }` | `{ name: '<BRAND>', url: 'https://<HOST>' }` |
| 1.7 | 15 | `creator` | `'The NYC Maid Cleaning Service LLC'` | Hoboken entity |
| 1.8 | 16 | `publisher` | `'The NYC Maid'` | `'<BRAND>'` |
| 1.9 | 20-24 | `keywords` | NYC-maid keyword array | Hoboken wash-and-fold keywords |
| 1.10 | 28 | `openGraph.siteName` | `'The NYC Maid'` | `'<BRAND>'` |
| 1.11 | 29 | `openGraph.title` | NYC maid title | Hoboken title |
| 1.12 | 30 | `openGraph.description` | NYC maid desc | Hoboken desc |
| 1.13 | 32 | `openGraph.url` | `'https://www.thenycmaid.com'` | `'https://<HOST>'` |
| 1.14 | 35 | `openGraph.images[0].url` | `'https://www.thenycmaid.com/icon-512.png'` | `'https://<HOST>/icon-512.png'` (confirm asset exists) |
| 1.15 | 43-44 | `twitter.title/description` | NYC maid | Hoboken |
| 1.16 | 55 | `alternates.canonical` | `'https://www.thenycmaid.com'` | `'https://<HOST>'` |
| 1.17 | 57-58 | `alternates.languages` en-US/es-US | `'https://www.thenycmaid.com'` | `'https://<HOST>'` |
| 1.18 | 77 | `other['og:email']` | `'hi@thenycmaid.com'` | Hoboken contact email |
| 1.19 | 94-96 | hreflang `<link>` en-US/es-US/x-default | `href="https://www.thenycmaid.com"` | `href="https://<HOST>"` |

Also sweep the rest of `other` (L72-80+: phone, street address, geo) — the read stopped at L80 but the block
continues; **treat the whole `layout.tsx` as NYC-Maid-contaminated** and diff it field-by-field against a
correct sibling before shipping.

**Verify after fix (must be clean):**
```bash
grep -rn "thenycmaid" src/app/site/wash-and-fold-hoboken/layout.tsx   # expect 0
npx tsc --noEmit
```
**Blocker:** do not apply until `<HOST>`/`<BRAND>` are confirmed from `tenants.domain`. A wrong host here
canonicalizes a live Hoboken site to a competitor's brand — worse than the current state.

---

## Flag 3 — `nyc-classifieds` three-way host disagreement (MED–HIGH) — **⚠ CONFIRM DOMAIN + Vercel env**

One site hardcodes three different production hosts, and `metadataBase` falls back to `localhost`:

```
layout.tsx:7   metadataBase : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
layout.tsx:39  canonical    : process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com'
_lib/seo.ts:7  SITE_URL     : 'https://nyc-classifieds.com'
```

`NEXT_PUBLIC_*` is inlined at **build** time — if the env var is unset at build, `metadataBase` bakes in
`http://localhost:3000` in production. And even when set, JSON-LD from `seo.ts` names `nyc-classifieds.com`
while the canonical names something else. **Decide ONE production host** (`<CANON>`, `www.` form to avoid
the Flag-2 apex→www trap), confirm it against `tenants.domain`, set it as `NEXT_PUBLIC_SITE_URL` in the
Vercel project env, and make all three agree. Replace the `localhost` fallback with `<CANON>` so a missing
env var fails **safe** (real host) instead of to localhost.

| # | File | Line | Before | After |
|---|------|------|--------|-------|
| 3.1 | `src/app/site/nyc-classifieds/layout.tsx` | 7 | `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),` | `metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://<CANON>'),` |
| 3.2 | `src/app/site/nyc-classifieds/layout.tsx` | 39 | `canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://thenycclassifieds.com',` | `canonical: process.env.NEXT_PUBLIC_SITE_URL || 'https://<CANON>',` |
| 3.3 | `src/app/site/nyc-classifieds/_lib/seo.ts` | 7 | `export const SITE_URL = 'https://nyc-classifieds.com'` | `export const SITE_URL = 'https://<CANON>'` |
| 3.4 | Vercel env (nyc-classifieds project) | — | (unset) | `NEXT_PUBLIC_SITE_URL=https://<CANON>` |

**Verify after fix:**
```bash
grep -rn "localhost:3000\|nyc-classifieds.com\|thenycclassifieds.com" src/app/site/nyc-classifieds/  # expect only intended <CANON>
npx tsc --noEmit
```
**Blocker:** confirm `<CANON>` from `tenants.domain` before applying. `nyc-classifieds/_lib/seo.ts` is a
scaffold stub ("Replace with real schema builders when nyc-classifieds becomes a live tenant") — this whole
site may not be launch-imminent; prioritize accordingly.

> **Env-based fields are NOT asserted by the regression test.** Because both `metadataBase` and `canonical`
> here depend on `process.env.NEXT_PUBLIC_SITE_URL`, the test cannot know the built value and deliberately
> skips the redirect check for `nyc-classifieds` (it still confirms `metadataBase` is *declared*). This flag
> is guarded by this spec, not by the test.

---

## Flag 4 — `consortium-nyc`, `the-nyc-marketing-company`, `the-nyc-interior-designer` (see companion)

These declare **www** metadata while `middleware.ts` treats them as **apex-canonical** (excluded from the
apex→www 301, so served at the bare apex). The redirect direction that creates the conflict is set in the
**Vercel dashboard** (www→apex), not in code — so it needs **live confirmation** before a fix is chosen, and
is **out of scope for the code-only regression test** (which replicates only the middleware apex→www rule).
Full evidence, live probes, and both fix options are in [`seo-canonical-audit.md`](./seo-canonical-audit.md).
Not duplicated here.

---

## Apply order (recommended)

1. **Flag 2** and **Flag 5** — exact, no confirmation, no external change. Apply, run
   `npx tsc --noEmit` + `npm test`, watch the two tracked-RED entries flip and retire them.
2. **Flag 3** env var — set `NEXT_PUBLIC_SITE_URL` in Vercel once `<CANON>` is confirmed; then 3.1-3.3.
3. **Flag 1** — only after `tenants.domain` for `wash-and-fold-hoboken` is confirmed. Highest brand risk.
4. **Flag 4** — needs a live probe of the three apex domains first (companion doc).
