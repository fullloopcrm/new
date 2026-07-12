# CSP & Security-Headers Spec — audit + nonce-based CSP to add

**Worker:** W6 · **Branch:** p1-w6 · **Date:** 2026-07-12
**Scope:** Docs-only. Audit the response security headers Full Loop CRM ships today,
and specify the exact header set (including a nonce-based Content-Security-Policy) to
add. **No code changed.** This is an implementation spec, not an implemented change.

> **Honesty flags (read before relying on this):**
> - The leader's premise was "FL likely ships no CSP." **CSP is genuinely absent —
>   that part is correct.** But FL is *not* header-less: it already ships five
>   security headers (see §1). Do not repeat "FL ships no security headers" — it's
>   wrong and this spec exists to correct it.
> - The CSP directives in §3 are **derived from a code inventory** (§2), not
>   cargo-culted. They will still need a **Report-Only shakeout** (§5) before
>   enforcement — I cannot prove zero breakage from a static read.
> - **This app is a hostile environment for a strict nonce CSP.** 478 inline
>   `application/ld+json` blocks + 219 files using `dangerouslySetInnerHTML` +
>   inline third-party bootstraps (PostHog, GA/gtag) + a root-layout inline script
>   all become CSP violations the moment `script-src` drops `'unsafe-inline'`.
>   The header is one line; making the app *not break under it* is the real work.
>   I am flagging that up front, not burying it.

---

## 1. Current state — what ships today

Source of truth: `platform/next.config.ts` → `async headers()`, applied to `source: '/(.*)'`
(every route, every host — marketing, app, and all tenant `/site/*` pages).

| Header | Current value | Verdict |
|--------|---------------|---------|
| `X-Content-Type-Options` | `nosniff` | ✅ good |
| `X-Frame-Options` | `DENY` | ✅ good (but see note) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ good |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | ✅ good (2y, preload) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(self)` | ✅ good, minor gaps |
| `X-DNS-Prefetch-Control` | `on` | ⚠️ neutral / optional |
| **`Content-Security-Policy`** | **— (absent)** | ❌ **the gap** |
| `Cross-Origin-Opener-Policy` | — (absent) | ⚠️ recommended |
| `Cross-Origin-Resource-Policy` | — (absent) | ⚠️ optional |
| `X-Permitted-Cross-Domain-Policies` | — (absent) | ⚠️ optional (Adobe/Flash legacy) |

**Assessment:** the existing set is a solid baseline — the "cheap wins" (nosniff,
clickjacking, HSTS, referrer) are already in place. The single material gap is **CSP**,
which is the one header that mitigates XSS and unexpected third-party script execution.
`X-Frame-Options: DENY` also duplicates what CSP `frame-ancestors` should own; keep XFO
for legacy browsers, but CSP's `frame-ancestors` is the authoritative control.

### 1a. Minor fixes to the existing headers (independent of CSP)

- **`Permissions-Policy`** — add explicit denies for powerful features the app never
  uses, so they can't be silently enabled by a compromised script or embedded frame:
  ```
  Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=(),
    usb=(), magnetometer=(), accelerometer=(), gyroscope=(), interest-cohort=()
  ```
  (`interest-cohort=()` opts out of FLoC; keep `geolocation=(self)` — the maps/territory
  UI uses it.)
- **`X-DNS-Prefetch-Control: on`** — harmless; leaks a little navigation intent via DNS.
  Optional to drop. Not a priority.
- Consider **`Cross-Origin-Opener-Policy: same-origin`** on the app/dashboard surfaces
  (isolates the browsing context; blocks cross-window attacks). Do **not** blanket it on
  tenant `/site/*` — the YouTube embeds and OAuth popups (Google) can break under COOP.

---

## 2. Code inventory — what the CSP must actually allow

This is the load-bearing section. A CSP that forgets one of these origins breaks a live
page. Derived from grepping `platform/src` on 2026-07-12.

### 2a. Inline scripts (the hard part)

| Source | Count / location | CSP impact |
|--------|------------------|------------|
| JSON-LD structured data `<script type="application/ld+json">` | **478 matches** across tenant SEO pages | Each is an inline script → needs a nonce, or `script-src` stays permissive |
| `dangerouslySetInnerHTML` (all uses) | **219 files** | Superset of the above; includes JSON-LD + a few HTML injections |
| Root-layout chunk-reload handler | `src/app/layout.tsx` — inline `<script dangerouslySetInnerHTML>` | Runs on **every** page; must carry the nonce or CSP breaks globally |
| PostHog bootstrap | `.../apply/layout.tsx` — `<Script id="posthog-init">` inline init | Inline script + connects to PostHog host |
| GA / gtag | `site/the-nyc-exterminator/layout.tsx` — `<Script src=gtag/js>` + inline `gtag()` config | External script + inline config |

> **Implication:** with a nonce CSP, **every** inline `<script>` the app emits must be
> rendered with `nonce={nonce}`. Next.js handles *its own* framework/bundle scripts
> automatically when a nonce is present in the request CSP (see §4), but the **478
> JSON-LD blocks and the hand-written inline scripts above are app code and must be
> updated by hand** (or moved to external nonce'd files). This is the migration cost.

### 2b. External browser-loaded origins (per directive)

| Directive | Origins needed | Why |
|-----------|----------------|-----|
| `script-src` | `'self'`, `https://www.googletagmanager.com`, `https://us.i.posthog.com`, `https://unpkg.com` | gtag/js; PostHog assets; Leaflet JS (`unpkg.com/leaflet@1.9.4/dist/leaflet.js`) on `nyc-mobile-salon` maps |
| `style-src` | `'self'`, `'unsafe-inline'`, `https://unpkg.com` | Tailwind/styled inline styles; Leaflet CSS from unpkg. **See §3 note on `'unsafe-inline'` for styles** |
| `img-src` | `'self'`, `data:`, `blob:`, `https:` | Pexels, Unsplash, Supabase storage, `cdnjs.cloudflare.com` (Leaflet marker PNGs), `basemaps.cartocdn.com`, Google review photos, tenant-supplied hosts. Tenant image hosts are open-ended → `https:` is pragmatic here |
| `font-src` | `'self'` | **All fonts are `next/font/google`, self-hosted at build** (served from `/_next`). No `fonts.gstatic.com` needed — confirm this holds; if any tenant switches to runtime Google Fonts, add `https://fonts.gstatic.com` |
| `connect-src` | `'self'`, `https://*.supabase.co`, `wss://*.supabase.co`, `https://us.i.posthog.com`, `https://*.google-analytics.com`, `https://analytics.google.com`, `https://basemaps.cartocdn.com`, `https://vitals.vercel-insights.com` | Supabase REST + realtime WS; PostHog; GA beacons; Carto map tiles; Vercel web-vitals |
| `frame-src` | `'self'`, `https://www.youtube.com` | YouTube `/embed` iframes on referral pages. **No Stripe iframe found** — payment is a full-page redirect to `buy.stripe.com` (hosted checkout), not embedded Elements, so `js.stripe.com`/`frame-src stripe` are **not** required today. If Stripe Elements is ever embedded, add `https://js.stripe.com` (script) + `https://*.stripe.com` (frame/connect) |
| `frame-ancestors` | `'none'` | Nothing should frame FL surfaces (matches `X-Frame-Options: DENY`) |
| `object-src` | `'none'` | No `<object>`/`<embed>` in use |
| `base-uri` | `'self'` | Block `<base>` hijacking |
| `form-action` | `'self'`, `https://buy.stripe.com` | Forms post same-origin; payment-link redirect target |

> **Note on Stripe:** I searched for `js.stripe.com` / `@stripe/stripe-js` / `loadStripe`
> in `src` and found **none** in browser code — Stripe is used server-side (Node SDK) and
> client payment is a redirect to `buy.stripe.com`. If that changes, the CSP must change.
> Stated so a future reader doesn't assume Stripe.js is covered.

---

## 3. The CSP to add

### 3a. Recommended production directive (nonce + strict-dynamic)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}' 'strict-dynamic' https:;
  style-src 'self' 'unsafe-inline' https://unpkg.com;
  img-src 'self' data: blob: https:;
  font-src 'self';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co
    https://us.i.posthog.com https://*.google-analytics.com
    https://analytics.google.com https://basemaps.cartocdn.com
    https://vitals.vercel-insights.com;
  frame-src 'self' https://www.youtube.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://buy.stripe.com;
  upgrade-insecure-requests;
```

**Why `'strict-dynamic'` + `https:`:** with `'strict-dynamic'`, a browser that
understands it **ignores the host allowlist for scripts** and trusts only scripts loaded
by an already-nonce'd script. This is what lets Next.js's own chunk-loading work cleanly
and lets the nonce'd PostHog/gtag/Leaflet loaders pull their dependencies without
enumerating every CDN path. The trailing `https:` is the **fallback for older browsers**
that ignore `'strict-dynamic'` — they fall back to "any https script," which is weaker but
still blocks `http:` and inline injection. Modern browsers ignore the `https:` when
`'strict-dynamic'` is present. This is the standard Google-CSP-Evaluator "strict CSP"
shape.

**Why `style-src 'unsafe-inline'`:** eliminating inline styles is impractical here
(Tailwind arbitrary values, styled inline `style=` attributes, Leaflet). `'unsafe-inline'`
for **styles only** is a widely accepted tradeoff — style injection is far lower-risk than
script injection. Do **not** add `'unsafe-inline'` to `script-src`; that would defeat the
entire CSP. (Note: you cannot combine a nonce with `'unsafe-inline'` for scripts anyway —
the nonce causes browsers to ignore `'unsafe-inline'`.)

`{NONCE}` is a per-request base64 value generated in middleware (§4).

### 3b. Report-Only variant (deploy this FIRST — see §5)

Same directive, sent as `Content-Security-Policy-Report-Only` with a reporting endpoint:

```
Content-Security-Policy-Report-Only: <directives above>; report-uri /api/csp-report;
```

Report-Only **never blocks** — it logs violations. This is how you discover the pages the
static inventory missed before you turn on enforcement.

---

## 4. How to wire it in Next.js (App Router) — mechanism, not implementation

FL already runs `src/middleware.ts` on requests (tenant resolution + header signing), so
the nonce hook slots into the existing middleware — no new middleware file.

1. **Generate a nonce per request** in `middleware.ts`:
   `const nonce = btoa(crypto.randomUUID())` (Edge runtime has Web Crypto).
2. **Build the CSP string** with the nonce interpolated, set it on **both** the request
   headers (so the app can read it) and the response headers:
   - `requestHeaders.set('x-nonce', nonce)`
   - `requestHeaders.set('content-security-policy', csp)` ← Next reads this to auto-nonce
     its own scripts
   - Return `NextResponse.next({ request: { headers: requestHeaders } })` and also set the
     CSP on the outgoing response.
3. **Read the nonce in Server Components** that emit inline scripts:
   `const nonce = (await headers()).get('x-nonce')` and pass `nonce={nonce}` to every
   inline `<script>` / `<Script>` — root layout chunk-reload script, JSON-LD blocks,
   PostHog init, gtag config.
4. **Move CSP OUT of `next.config.ts`.** A nonce must be per-request; `next.config.ts`
   headers are static and cannot carry a nonce. **Keep** the other five headers in
   `next.config.ts` (they're static and fine there), and set **only** the CSP from
   middleware. Do not define CSP in both places.

> **Framework caveat:** Next.js auto-applies the nonce to the scripts *it* generates only
> when it detects a nonce inside the `content-security-policy` request header — hence step
> 2 sets it on the request, not just the response. This is documented Next behavior but is
> exactly the kind of thing that silently regresses on a Next major upgrade — re-verify
> after any `next` bump.

### 4a. The JSON-LD problem (biggest single task)

478 inline `application/ld+json` blocks are spread across tenant SEO pages. Options,
cheapest-correct-first:

- **A. Nonce every block.** Thread the request nonce into each JSON-LD `<script>`. Correct,
  but touches ~478 sites. Best done by centralizing JSON-LD emission through one shared
  component that reads the nonce, then replacing ad-hoc blocks with it.
- **B. Hash-allowlist.** JSON-LD is static per page → compute SHA-256 hashes and add them
  to `script-src`. Breaks the moment content changes; unmanageable at 478 and growing.
  **Not recommended.**
- **C. Leave JSON-LD un-nonced and accept it's blocked.** JSON-LD is inert data consumed by
  crawlers server-side rendered HTML — **but** browsers still parse `type="application/ld+json"`
  as a script element subject to `script-src`. If blocked, structured data may not be read
  by some consumers. **Do not silently choose this** — it's an SEO regression risk. Decide
  with eyes open.

**Recommendation:** option A via a shared `<JsonLd nonce={nonce} data={...}>` component.
It's the only option that scales.

---

## 5. Rollout plan (do not enforce on day one)

1. **Phase 0 — add the static header fixes** from §1a (Permissions-Policy expansion, optional
   COOP on app surfaces). Zero risk, no CSP. Ship independently.
2. **Phase 1 — Report-Only.** Add the middleware nonce plumbing and emit
   `Content-Security-Policy-Report-Only` (§3b) with `/api/csp-report`. **Nothing breaks.**
   Collect violations for a representative window across marketing, app, and **every distinct
   tenant template** (`nycmaid`, `theroadsidehelper`, `nyc-mobile-salon`, `the-nyc-exterminator`,
   `toll-trucks-near-me`, etc. — they load *different* third parties: only exterminator has GA,
   only mobile-salon loads Leaflet from unpkg, etc.).
3. **Phase 2 — fix violations.** Nonce the inline scripts (§4/§4a), add any origin the report
   surfaced that this static audit missed. Re-run Report-Only until the report is clean.
4. **Phase 3 — enforce.** Flip to `Content-Security-Policy` (blocking). Keep the report-uri so
   regressions are visible.
5. **Phase 4 — tighten.** Once stable, consider dropping the `https:` fallback in `script-src`
   (leaving `'self' 'nonce' 'strict-dynamic'`) and narrowing `img-src` off `https:` if tenant
   image hosts can be enumerated.

---

## 6. Per-route / per-host caveats

One CSP over `/(.*)` covers three very different surfaces. Note where a single policy strains:

- **Tenant `/site/*` (public marketing sites)** — widest third-party surface: YouTube embeds,
  Leaflet from unpkg, GA (exterminator), PostHog (some apply funnels), open-ended image hosts.
  This is what forces `img-src https:` and the frame-src/unpkg allowances. If you ever want a
  **strict** app-CSP, scope a tighter policy to `/dashboard`, `/admin`, `/team` and a looser one
  to `/site/*` by branching in middleware on pathname/host. Recommended eventually; not required
  for v1.
- **App `/dashboard`, `/admin`, `/team`** — authenticated, minimal third parties (Supabase +
  Vercel vitals). Could run a much stricter CSP (`img-src 'self' data: blob: https://*.supabase.co`,
  no youtube/unpkg). Best candidate for `Cross-Origin-Opener-Policy: same-origin`.
- **Clerk segments (`/dashboard`, `/sign-in`, `/sign-up`, `/join`)** — Clerk is mounted only in
  these (per root-layout comment). **If Clerk client is active, it loads `clerk.fullloopcrm.com`
  and Clerk JS** → those origins must be added to `script-src`/`connect-src`/`frame-src` for
  those routes. Clerk is currently described as dormant/PIN-auth elsewhere; **verify Clerk's
  browser footprint before enforcing CSP on those four segments** or sign-in breaks. This is the
  most likely single point of CSP breakage — flag it to whoever implements.
- **`buy.stripe.com` redirect** — outbound navigation, governed by `form-action`, not `frame-src`.

---

## 7. What this spec does NOT do

- It does not change any code, header, or config. `next.config.ts` is untouched.
- It does not prove the CSP is breakage-free — that requires the Report-Only phase (§5).
- It does not enumerate the 478 JSON-LD sites individually — it specifies the shared-component
  approach to fix them as a class.
- It does not cover Clerk's exact CSP origins — flagged as a required pre-enforcement check (§6).

**Bottom line:** the five existing headers are fine and already shipped. The real deliverable
here is a *phased* CSP: static header polish now (low risk), then nonce plumbing + Report-Only,
then fix-and-enforce. The header is trivial; the 478 inline scripts and the Clerk footprint are
where the actual work and risk live.
