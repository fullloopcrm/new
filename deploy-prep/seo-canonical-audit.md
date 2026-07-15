# SEO Canonical / Duplicate-Content Audit (apex-canonical tenants)

**Author:** W3 · **Date:** 2026-07-12 · **Scope:** docs + verify only (no route edits)
**Status:** findings for LEADER/Jeff to action — DO NOT self-apply route/middleware edits.

---

## TL;DR

Three tenant domains are configured as **apex-canonical** in `src/middleware.ts`
(`APEX_CANONICAL_DOMAINS`) — the middleware deliberately **excludes** them from the
global apex→www 301. But **every content-level SEO signal for those same domains
declares `www` as canonical** (metadataBase, `alternates.canonical`, OpenGraph `url`,
breadcrumb JSON-LD, `sitemap.ts` BASE, and `robots.ts` sitemap ref). The routing
architecture (apex-canonical) and the emitted signals (www-canonical) **disagree**.

Result on the new platform: both apex and `www` return **200** for the same content,
consolidated only by a `<link rel=canonical>` tag pointing at `www` — no redirect
backstop. This is confirmed **live today** on the one domain already migrated.

**Action required:** pick ONE canonical host per domain and align middleware + Vercel
domain config + all metadata to it. Recommendation and per-domain fix below.

---

## Affected domains

| Domain | In `APEX_CANONICAL_DOMAINS`? | Named by leader? |
|---|---|---|
| `consortiumnyc.com` | yes | yes |
| `thenycmarketingcompany.com` | yes | yes |
| `thenycinteriordesigner.com` | yes | **no — W3 added; same defect class** |

The leader named the first two. `thenycinteriordesigner.com` is in the *same*
`APEX_CANONICAL_DOMAINS` set with the *same* www-metadata mismatch, and it is already
live on FL, so it is the concrete proof case. Any fix must cover all three.

---

## Evidence

### Live probe (curl, 2026-07-12)

```
consortiumnyc.com/            => 308 -> https://www.consortiumnyc.com/     (old host, pre-cutover)
www.consortiumnyc.com/        => 200
thenycmarketingcompany.com/   => 308 -> https://www.thenycmarketingcompany.com/  (old host, pre-cutover)
www.thenycmarketingcompany.com/ => 200
thenycinteriordesigner.com/       => 200   (ALREADY on FL platform)
www.thenycinteriordesigner.com/   => 200   (ALREADY on FL platform)
```

Both `thenycinteriordesigner.com` 200 responses serve the **same** tag:

```html
<link rel="canonical" href="https://www.thenycinteriordesigner.com"/>
```

So: **two 200 URLs (apex + www), identical content, both declaring `www` canonical, and
neither redirecting.** Consolidation depends entirely on Google honoring the tag — there
is no 301/308 backstop.

`consortiumnyc.com` and `thenycmarketingcompany.com` still show the *old host* behavior
(apex 308→www). On cutover to FL they will flip to the `thenycinteriordesigner.com`
pattern above (apex 200, no redirect). **This is the leader's stated risk, confirmed.**

### Code (this branch)

- `src/middleware.ts` — `APEX_CANONICAL_DOMAINS = { consortiumnyc.com,
  thenycmarketingcompany.com, thenycinteriordesigner.com }`; these are excluded from the
  apex→www 301 block. Comment rationale: FL/Vercel treats apex as primary and 307s
  www→apex, which fights the apex→www 301 and infinite-loops; serving at apex "breaks the
  loop with no DNS work."
- `src/app/site/consortium-nyc/layout.tsx` — `metadataBase`, OG `url`, and
  `alternates.canonical` all `https://www.consortiumnyc.com`.
- `src/app/site/consortium-nyc/page.tsx` — `alternates.canonical` + breadcrumb JSON-LD `www`.
- `src/app/site/consortium-nyc/sitemap.ts` — `BASE = "https://www.consortiumnyc.com"`.
- `src/app/site/the-nyc-marketing-company/{layout,page}.tsx` — same, all `www`.
- `src/app/site/the-nyc-marketing-company/robots.ts` — hardcodes
  `sitemap: ["https://www.thenycmarketingcompany.com/sitemap.xml"]`.
- `src/app/site/the-nyc-marketing-company/sitemap.ts` — `BASE = "https://www.thenycmarketingcompany.com"`.
- `src/app/site/the-nyc-interior-designer/layout.tsx` — `metadataBase`, OG `url`,
  `alternates.canonical` all `https://www.thenycinteriordesigner.com`; has a `sitemap.ts`.

### Contradiction summary

| Signal | Declares canonical host |
|---|---|
| `middleware.ts` (routing intent) | **apex** (excluded from apex→www redirect) |
| `metadataBase` / `alternates.canonical` / OG `url` | www |
| breadcrumb JSON-LD | www |
| `sitemap.ts` BASE | www |
| `robots.ts` sitemap ref | www (marketing) / apex origin (global robots — see §Secondary) |

Right now the **tag wins** (www serves 200, tag says www) so Google will most likely
index `www` — which means the middleware apex exclusion buys nothing for SEO and only
removes the redirect backstop. It is a fragile, self-contradicting configuration.

---

## Why this matters

1. **No redirect backstop.** Duplicate 200s consolidated by tag alone. If Google ever
   distrusts the tag (e.g. because the declared canonical URL itself gets a redirect —
   see risk 2), it falls back to its own choice → split signals, ranking dilution, GSC
   "Duplicate, Google chose different canonical than user."
2. **Latent loop-adjacent canonical trap.** The middleware comment states Vercel 307s
   www→apex for these domains. IF that is true in the FL Vercel project, then:
   `canonical → www → 307 → apex`. Google follows the redirect, lands on apex, and may
   **ignore the www canonical tag** because it points at a redirecting URL — while
   sitemap/OG/breadcrumb still insist on www. That is the worst case: inconsistent
   signals across the board.
   - **Not verifiable from here.** Live `www.thenycinteriordesigner.com` currently
     returns **200, not 307** — which *contradicts* the "Vercel 307s www→apex" comment.
     The actual per-domain redirect behavior is set in the **Vercel dashboard domain
     config**, which I cannot inspect (no dashboard access, and out of scope to change).
     **This must be confirmed by whoever owns the Vercel project before choosing a fix.**
3. **Cutover regression for the two named domains.** They are currently clean
   (apex 308→www, single canonical host). Cutover to FL removes that redirect. Net SEO
   posture goes from "clean 301 consolidation" to "tag-only consolidation" — a
   regression, even if mild.

---

## Recommended fix

**Pick one canonical host per domain and make routing + Vercel + metadata agree.**
Two coherent options; recommendation first.

### Option A — www-canonical (RECOMMENDED, least signal churn)

Every content signal already says `www`. Only routing/config needs to change:

1. **Vercel domain config:** set `www.<domain>` as the **primary** domain for each of the
   three; Vercel then issues apex→www **308** at the edge (no middleware involvement).
2. **`src/middleware.ts`:** **remove** the three from `APEX_CANONICAL_DOMAINS`. With
   Vercel doing apex→www at the edge, the apex request never reaches the middleware
   redirect, so the infinite-loop the comment worried about does not occur (the loop only
   happened when middleware 301'd apex→www *while* Vercel 307'd www→apex in the opposite
   direction — resolved by making Vercel agree on www).
3. **No metadata edits needed** — canonical/OG/sitemap/robots already emit `www`.

**Prerequisite / open question:** the middleware comment claims www "isn't cleanly served
on FL" for these domains (implying a DNS or Vercel-primary issue). If www genuinely cannot
be served as primary (e.g. apex-only A record, no www CNAME), Option A is blocked until
DNS is fixed — go to Option B. **Confirm www-serving in Vercel before committing to A.**

### Option B — apex-canonical (fallback if www cannot be served)

Keep middleware as-is (apex served, in `APEX_CANONICAL_DOMAINS`), set **apex as Vercel
primary** so www→apex **308** at the edge, and flip **all** content signals www→apex:

- `metadataBase`, `alternates.canonical`, OG `url`, breadcrumb JSON-LD `url` in each
  `layout.tsx` + `page.tsx` (all 3 sites).
- `sitemap.ts` `BASE` (consortium-nyc, the-nyc-marketing-company; verify interior-designer).
- `the-nyc-marketing-company/robots.ts` sitemap array → apex.

More edits, more risk of missing a signal, but it matches the existing middleware intent
and needs no www DNS.

### Per-domain action table

| Domain | Current live | Option A (recommended) | Option B |
|---|---|---|---|
| `consortiumnyc.com` | old host, apex 308→www | Vercel www-primary; drop from `APEX_CANONICAL_DOMAINS` | apex-primary; flip layout/page/sitemap to apex |
| `thenycmarketingcompany.com` | old host, apex 308→www | same as above | same + `robots.ts` sitemap → apex |
| `thenycinteriordesigner.com` | **FL live, apex 200 + www 200 (dup)** | same as above — **fix first, it's live** | flip layout/page/sitemap to apex |

Whichever option: **end state per domain must be one 200 host + the other host 308→it +
every signal naming the 200 host.**

---

## Secondary findings (lower severity)

- **robots.xml sitemap host vs sitemap content host.** `consortium-nyc` and
  `the-nyc-interior-designer` use the **global** `src/app/robots.ts`, which emits
  `sitemap: https://<host>/sitemap.xml` using the *request* host — so on the apex it
  points at `https://consortiumnyc.com/sitemap.xml` while the sitemap **content**
  (`sitemap.ts` BASE) lists `www` URLs. `the-nyc-marketing-company` hardcodes the `www`
  sitemap in its own `robots.ts`. Align these to the chosen canonical host as part of the
  fix above.
- **`the-nyc-interior-designer/sitemap.ts` host not asserted here.** It exists but I did
  not confirm which host it emits (no `BASE`/host string surfaced in grep). Verify it
  emits the chosen canonical host before shipping.

---

## Verification performed

- Live `curl -I`-style probes of apex + www for all three domains (status + redirect
  target), 2026-07-12. Counts/results pasted in §Evidence.
- Live fetch of the served `<link rel=canonical>` tag on both
  `thenycinteriordesigner.com` hosts.
- Static read of `middleware.ts` `APEX_CANONICAL_DOMAINS` + the three site dirs'
  `layout.tsx` / `page.tsx` / `sitemap.ts` / `robots.ts`.

## NOT verified (out of my vantage / scope)

- **Vercel dashboard per-domain redirect config** (which host is primary, whether
  www→apex is 307/308/200). The live `www.thenycinteriordesigner.com` = 200 contradicts
  the in-code "Vercel 307s www→apex" comment; resolve this before choosing A vs B.
- No route/middleware/metadata edits were made (docs-only task).
