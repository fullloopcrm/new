# Resolver-Flip Smoke Runbook

Post-deploy smoke test for the **tenant_domains-first** resolver
(`getTenantByDomain` in `src/lib/tenant-lookup.ts`) and its **TENANT_DIVERGENCE
assert-and-refuse** guard.

- **Suite:** `src/lib/tenant-resolver-flip.smoke.test.ts`
- **Fixture:** `src/lib/tenant-resolver-flip.fixture.ts`
- **Runner:** vitest

## What it proves

| Part | Runs when | What it asserts | Touches prod? |
|---|---|---|---|
| Offline sanity | always | fixture exposes ≥ 20 hosts; carrying subdomains match the live `BESPOKE_SITE_TENANTS` set (no drift) | no |
| **B — synthetic divergence** | always | the assert-and-refuse guard **throws `TENANT_DIVERGENCE`** when `tenant_domains -> A` disagrees with legacy `tenants.domain -> B`; agreement passes; a dangling pointer resolves to `null` (never brand-swaps) | **no** — fully mocked Supabase, no divergence is ever written |
| **A — live resolution** | `SMOKE_RUN=1` only | for each known tenant host, a deployed URL resolves it to the **right** tenant (the `x-tenant-slug` response header) — the wrong-tenant/brand-swap probe | read-only GETs |

Part B is the "does the refuse-guard actually fire" proof and needs no network
and no database — run it in CI on every change. Part A is the post-flip check.

## The resolution signal

`rewriteToSite()` in `src/middleware.ts` sets an `x-tenant-slug` **response
header** naming the tenant the host resolved to. The live smoke reads it and
asserts it equals the expected slug. Verified externally observable on the
platform deploy:

```
$ curl -sI https://nycmaid.fullloopcrm.com/
HTTP/2 200
x-tenant-slug: nycmaid          # <- the signal
```

## The host list (what gets probed)

Two groups, both in the fixture, **neither guessed**:

1. **Carrying subdomains** — `<slug>.fullloopcrm.com`, one per bespoke tenant.
   Parsed straight out of `BESPOKE_SITE_TENANTS` in `src/middleware.ts`, so the
   list can't drift from the router. These are served by the platform deploy
   **right now**, so they're the reliable "is the resolver healthy" set.
2. **Custom domains** — real domains sourced from committed code/migrations
   (`STATIC_TENANT_MAP`, `APEX_CANONICAL_DOMAINS`, migration 043 seeds, the
   protected-tenant guard). Each has a `source` note in the fixture.

> Custom domains whose authoritative value lives only in the prod
> `tenant_domains` table are **not** invented in the fixture. Export them and
> feed them in via `SMOKE_DOMAINS_JSON` (below) to cover every live domain.

## Running it

From `platform/`:

```bash
# Part B + offline sanity only (CI default — no network, no prod):
npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts

# Full suite incl. live resolution, hitting each host's real domain directly
# (canonical check AFTER DNS is pointed at the platform):
SMOKE_RUN=1 npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts

# Live resolution against a specific deployment (e.g. a preview), overriding Host:
SMOKE_RUN=1 SMOKE_TARGET_URL=https://platform-ten-psi.vercel.app \
  npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts

# Drive the host list off an authoritative tenant_domains export instead of the
# built-in fixture (JSON: [{ "host": "...", "expectedSlug": "..." }, ...]):
SMOKE_RUN=1 SMOKE_DOMAINS_JSON=/abs/path/domains.json \
  npx vitest run src/lib/tenant-resolver-flip.smoke.test.ts
```

### Env vars

| Var | Effect |
|---|---|
| `SMOKE_RUN=1` | enables Part A (live network). Unset → Part A is skipped. |
| `SMOKE_TARGET_URL` | base URL to probe with an overridden `Host` header (preview mode). Unset → each host is hit directly at `https://<host>/`. |
| `SMOKE_DOMAINS_JSON` | path to a JSON array of `{host, expectedSlug}` that replaces the built-in fixture list. |

## Direct mode vs preview (Host-override) mode

- **Direct mode** (`SMOKE_TARGET_URL` unset): hits `https://<host>/` and follows
  redirects (apex → www). This is the **canonical post-DNS-flip check** — it
  tests exactly what a real visitor gets. Use it once the domain is pointed at
  the platform.
- **Preview mode** (`SMOKE_TARGET_URL` set): hits the given base URL with
  `Host: <domain>` so you can test the **new deploy before flipping DNS**. This
  only works if that deployment honors an overridden `Host` header — true for a
  local `next dev`/self-hosted node server, or a Vercel deployment that has the
  domain attached (plus a protection-bypass token for protected previews). Some
  edge setups route strictly by real Host and will ignore the override; if every
  host then reports the same slug or none, you're in that case — fall back to
  direct mode after the flip.

## Expected results by phase

- **Before the flip / before a custom domain is pointed at the platform:** the
  carrying-subdomain checks (`<slug>.fullloopcrm.com`) pass; a custom domain
  still served by an external/standalone deploy returns **no** `x-tenant-slug`
  and its check **fails** with a "did not resolve / header stripped" message.
  That is correct — that domain isn't on the flipped resolver yet. (Observed
  today: `www.thenycmaid.com` returns 200 with no `x-tenant-slug`, while
  `nycmaid.fullloopcrm.com` carries it.)
- **After the flip, DNS pointed at the platform:** both groups resolve to the
  right slug and Part A is green.

## Reading a failure

- `resolved to "X" but expected "Y" — WRONG TENANT (brand swap)` — the
  **critical** case: the host is serving the wrong tenant. Do not proceed with
  the cutover; this is the exact failure the flip exists to prevent.
- `no x-tenant-slug on response` — the host resolved to no tenant, **or** the CDN
  is stripping `x-*` response headers, **or** (common pre-flip) the domain is
  still served by a non-platform deploy. Confirm the domain points at the
  platform. If headers are genuinely stripped in your edge config, assert on
  page content instead (e.g. the tenant's brand string in the HTML body).
- `HTTP >= 400` — the deploy isn't serving that host at all.

## Divergence alerting (Part B is the unit-level proof)

Part B proves the guard throws and logs a greppable line:

```
TENANT_DIVERGENCE host=<h> td=<A> legacy=<B>
```

After the flip, alert on that string in production logs — if it ever appears, a
real host is claimed by two tenants and the resolver is (correctly) refusing to
serve either. Fix the divergent row before that host can serve again.
