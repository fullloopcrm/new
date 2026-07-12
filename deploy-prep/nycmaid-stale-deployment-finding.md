# www.thenycmaid.com serving from a deployment missing current API routes

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12
**Severity:** HIGH · **Status:** unresolved, needs a human with Vercel dashboard access
**Source:** live read-only curl probe against production, session ~21:56–21:59 UTC
(full raw command list + all results: `/tmp/w4-report-20260712-180037.md`).
**Do NOT touch Vercel** — this doc is the handoff artifact; the fix (if the
hypothesis is right) is a Vercel dashboard action outside this read-only lane.

## TL;DR

`thenycmaid.com` / `www.thenycmaid.com` is nycmaid's own live custom domain —
nycmaid is the flagship/primary tenant. Right now its API routes 404 with
Next.js's *generic* not-found page, not the app's own JSON responses, while
its static/ISR pages keep serving 200s from a stale edge cache. Any
client-side code on that live site depending on `/api/tenant/public`,
`/api/health`, or any other dynamic API route is silently broken **today**,
on the flagship tenant's own domain, while the marketing/booking pages look
completely fine to a casual visit.

## Evidence

All commands are plain `curl` GETs against already-deployed prod endpoints —
no state was changed anywhere.

### API routes — generic 404, route not matched at all

```
$ curl -sI https://www.thenycmaid.com/api/tenant/public
HTTP/2 404
x-matched-path: /404
x-next-error-status: 404
content-type: text/html; charset=utf-8
```
Body is Next.js's own "Page Not Found" HTML shell — **not** this app's JSON
404 (`{"error":"Tenant not found"}`), which is what the *same route* returns
correctly for other tenants (see contrast below).

```
$ curl -sI https://www.thenycmaid.com/api/health
HTTP/2 404
x-matched-path: /404
x-next-error-status: 404
```
Same signature. `/api/health` is a route that exists in the current codebase
and returns `200 {"status":"healthy",...}` on the main host
(`www.homeservicesbusinesscrm.com`) — confirmed working in this same probe
session. On `www.thenycmaid.com` it 404s as if the route doesn't exist in the
deployment being served.

### Static/ISR pages — 200, but from an ~8-hour-old edge cache

```
$ curl -sI https://www.thenycmaid.com/
HTTP/2 200
x-vercel-cache: HIT
age: ~29600          # ≈ 8.2 hours
```
Same pattern for `/robots.txt` and `/sitemap.xml` — 200, `x-vercel-cache: HIT`,
comparable `age`. These are almost certainly served straight from Vercel's
edge cache without invoking the current deployment's function at all, which
is why they still "work" even if the underlying deployment binding is stale.

### Contrast — the same routes work correctly on other tenants' domains

```
$ curl -s https://www.thefloridamaid.com/api/tenant/public
200 {"name":"The Florida Maid","domain":"thefloridamaid.com",...}

$ curl -s https://www.consortiumnyc.com/api/tenant/public
200 {"name":"Consortium NYC","domain":"consortiumnyc.com",...}
```
Both correct, both distinct tenants (no cross-tenant bleed). This confirms
the *code* is fine — `getTenantByDomain` / the route handlers work as
designed. The problem is specific to what `www.thenycmaid.com` resolves to at
the edge, not the application logic.

### Apex vs www

```
$ curl -sI https://thenycmaid.com/api/tenant/public
HTTP/2 301
location: https://www.thenycmaid.com/...
```
This is the app's own canonical-redirect logic (`middleware.ts:180-200`,
apex → www, since `thenycmaid.com` is not in `APEX_CANONICAL_DOMAINS`) —
working as intended. It's `www.thenycmaid.com` itself, post-redirect, that's
broken. Rules out a DNS/apex-only misconfiguration; TLS and HTTP routing both
function normally on the `www` host, so this is not a DNS problem.

## Working theory: stale Vercel domain → deployment binding

The signature (dynamic/serverless routes 404 with Vercel's generic error page,
static/ISR content still 200s from cache) is the classic fingerprint of a
custom domain aliased to an **old deployment that predates the current API
routes** — or a domain that has been detached from the `platform` project's
current production deployment entirely, leaving only whatever got cached at
the edge before the mismatch occurred.

This is a **hypothesis, not a confirmed root cause.** It is backed by:
- The exact 404 signature (`x-matched-path: /404`) that only shows up when a
  route genuinely isn't part of the serving deployment's build — a live
  deployment with the current routes returns the app's own JSON 404, as seen
  on `thefloridamaid.com` and `consortiumnyc.com`.
- The stale cache age (`age: ~29600s`) on the pages that DO still work,
  meaning those responses were generated before whatever changed.
- No DNS or TLS-layer symptoms — rules out a DNS misconfiguration or the
  domain not being verified/attached to Vercel at all (a fully-detached
  domain typically fails TLS or returns Vercel's "no such domain" page, not a
  200 with `x-vercel-cache: HIT`).

It is **not** confirmed because this lane has no Vercel dashboard/API access
from a read-only curl harness — the actual domain→deployment binding, alias
history, and current production deployment ID for the `platform` Vercel
project can only be checked by someone with Vercel project access.

## What needs to happen (outside this lane)

1. **A human (Jeff or whoever holds Vercel access) checks the `platform`
   Vercel project's Domains tab** for `thenycmaid.com` / `www.thenycmaid.com`
   and confirms which deployment they're currently aliased to.
2. If aliased to an old/wrong deployment: re-point the alias to the current
   production deployment (standard Vercel domain reassignment — not a code
   change, not something this worktree can do or should attempt).
3. After re-pointing, re-run the read-only verification: `curl -sI
   https://www.thenycmaid.com/api/health` should return `200
   {"status":"healthy",...}` matching the main host, and `curl -s
   https://www.thenycmaid.com/api/tenant/public` should return the app's JSON
   tenant payload for nycmaid (not a generic 404).
4. Spot-check that the static pages' content is actually current post-fix
   (the ~8h-stale cache may have been masking content drift too, not just API
   breakage) — compare `/`, `/robots.txt`, `/sitemap.xml` against what the
   current deployment renders on a known-good domain.

## Blast radius / why HIGH

- **nycmaid is the flagship/live-primary tenant** — this is not an edge-case
  tenant, it's the one the whole platform is validated against.
- Any client-side JS on the live site calling `/api/tenant/public`,
  `/api/health`, or other dynamic routes fails silently for real visitors
  right now — a casual look at the homepage shows nothing wrong (still 200,
  cached), which is exactly why this could go unnoticed without an explicit
  API-level probe.
- Unknown scope of *which* API routes are affected — this probe only checked
  `/api/tenant/public` and `/api/health`. If the deployment binding is
  genuinely stale/wrong, **every** API route under that domain is
  potentially serving 404 instead of the current app, including anything
  booking/checkout/lead-capture related that runs client-side on nycmaid's
  own site. This lane's charter is read-only GETs only — side-effect flows
  (checkout, lead capture) were correctly NOT probed here (see
  `deploy-prep/canary-tenant-provisioning-spec.md` / BLOCKED-ON-A5), so the
  full blast radius on write paths is unverified and could be worse than what
  this doc shows.

## Explicitly out of scope for this doc / this lane

- No Vercel dashboard, API, or CLI access was used or attempted.
- No code, config, DNS, or deployment changes were made.
- No side-effect (POST/PUT/DELETE) requests were sent anywhere.
- The hypothesis above is the strongest read-only explanation for the
  observed evidence, not a verified diagnosis — treat it as a starting point
  for whoever has Vercel access, not a confirmed fix.

## Cross-references

- Raw probe output / full command list: `/tmp/w4-report-20260712-180037.md`
- `deploy-prep/verification-harness-readiness.md` — the probe plan this
  session executed (P5 custom-domain resolution checks)
- `deploy-prep/post-deploy-verification-readiness.md` — decision matrix this
  finding should feed into for any future deploy gate
- `deploy-prep/tenants-public-route-not-registered.md` — the separate MEDIUM
  finding from the same probe session (middleware registration gap, not
  related to this deployment-binding issue)
