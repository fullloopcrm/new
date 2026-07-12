# `/api/tenants/public` missing from `isPublicRoute` — middleware registration gap

**Author:** W4 (verification-harness lane) · **Date:** 2026-07-12
**Severity:** MEDIUM (fails closed, no data leak, broken-as-designed)
**Source:** live read-only curl probe (`/tmp/w4-report-20260712-180037.md`), confirmed
by reading `src/middleware.ts`. Companion regression witness:
`src/middleware.tenants-public-not-public.witness.test.ts`.

## The gap

`src/app/api/tenants/public/route.ts` (`GET ?slug=` → `{tenant:{name,slug,logo_url}}`)
has **zero auth logic in the handler** — it is written to be a public,
unauthenticated read, the same shape as the already-registered
`/api/tenant/public` (singular) and `/api/tenant-sitemap`.

But `src/middleware.ts`'s `isPublicRoute` matcher (lines 67–155) does **not**
include `/api/tenants/public`. On the main host (`homeservicesbusinesscrm.com`,
`www.homeservicesbusinesscrm.com`, `fullloopcrm.com`, etc.) every request to
this path falls through to the Clerk-gated branch at line 255
(`if (!isPublicRoute(req)) { ... }`), finds no `admin_token` cookie (there's no
reason an anonymous visitor would have one), and gets a **307 redirect to
`/sign-in`** instead of reaching the route handler.

Confirmed live in prod (session ~21:56–21:59 UTC, 2026-07-12):

```
curl https://www.homeservicesbusinesscrm.com/api/tenants/public?slug=nycmaid
  → 307, location: /sign-in, body "Redirecting..." (not JSON)
curl https://www.homeservicesbusinesscrm.com/api/tenants/public?slug=the-florida-maid
  → 307, location: /sign-in
curl https://www.homeservicesbusinesscrm.com/api/tenants/public   (missing slug)
  → 307 (expected 400 per route.ts:8 — the route's own validation never runs)
curl https://www.homeservicesbusinesscrm.com/api/tenants/public?slug=zzz-does-not-exist-$RANDOM
  → 307 (expected 404 per route.ts:18 — same)
```

Root cause is registration order, not the handler: middleware intercepts and
redirects **before** the route's own code (including its 400/404 branches)
ever executes.

## Why this is MEDIUM, not HIGH

- **Fails closed.** The redirect leaks nothing — no tenant data, no error
  detail, no distinguishing signal between "tenant exists" and "tenant
  doesn't." An anonymous caller gets the same 307 either way.
- **No cross-tenant exposure.** This is a route-registration bug, not a
  data-isolation bug — out of scope for `deploy-prep/idor-scan-note.md` /
  `idor-remediation-status.md`, which track tenant-vs-tenant read leaks. Noted
  here as a separate class.
- **Currently low blast radius.** The only caller in the codebase is
  `src/app/apply/[slug]/page.tsx:70`, which fetches this exact endpoint. But
  `/apply` (the hiring funnel) is 410'd site-wide on the main host via
  `KILLED_ROUTES` in `middleware.ts:44-52` (confirmed live — matches the app's
  own JSON-less "Gone" response, not this redirect). So today the only caller
  is dead-but-reachable code; the gap has no live user-facing symptom.

## Why it's worth fixing before it matters

`middleware.ts:47`'s own comment says the sibling **buyer** funnel
(`/full-loop-crm-*` marketing pages, a *different* `/apply`-adjacent flow) "was
restored 2026-06-22" — i.e., killed routes on this codebase do get revived.
If `/apply` (tenant hiring) is ever un-killed the same way, this API will
immediately 307 for every anonymous applicant hitting it, and the failure mode
(a silent redirect to `/sign-in` instead of a 4xx JSON error) is a worse
debugging experience than a normal 404 — it looks like an auth problem, not a
routing gap.

## Fix (route-registration change, NOT this lane — leader/Jeff-gated)

Add one line to the `isPublicRoute` array in `src/middleware.ts` (alongside
the other already-public API routes, e.g. near `/api/tenant-sitemap` at line
132):

```ts
'/api/tenants/public(.*)',   // Public slug->tenant lookup (name/slug/logo_url only)
```

No handler change needed — `route.ts` already has correct validation
(missing-slug → 400, unknown-slug → 404, both scoped to non-sensitive fields).

## Verification after the fix ships

1. `src/middleware.tenants-public-not-public.witness.test.ts` — remove
   `.fails` from the WITNESS case; it should go permanently GREEN. Keep the
   two positive/contrast controls as-is (they don't change).
2. Live: `curl https://www.homeservicesbusinesscrm.com/api/tenants/public?slug=nycmaid`
   should return `200 {"tenant":{"name":"...", "slug":"nycmaid", "logo_url":...}}`
   instead of a 307.
3. Missing-slug and unknown-slug cases should return `400` / `404` JSON
   respectively (per `route.ts:8` and `:18`), not a redirect.

## Scope note

This lane is read-only verification (no route/middleware edits). Filed as a
tracked gap + regression witness, same pattern as the prior selena P2 finding
in `deploy-prep/idor-remediation-status.md`. The one-line `isPublicRoute` fix
is small and low-risk but is still a middleware behavior change on the main
host and stays leader/Jeff-gated per standing instructions.
