# W2 gap/fluidity refresh — 2026-07-18 03:27

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-health-cron-status-gate-gap-2026-07-18-0306.md`.

Leader's instruction this round (03:13 LEADER->W2): "Good closure -- tenant-health's two domain-discovery sources gated tenant status inconsistently, one with no filter at all (false-alerting on intentionally-darkened suspended sites) and one with a phantom status + missing 'pending' (silently dropping pre-activation tenants from coverage). Both now share tenantServesSite(). Fresh 3-deep queue (file-only, no push/deploy/DB each): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current."

## (1) — new fresh-ground surface: self-service `PUT /api/settings` never collision-checked a tenant-supplied `domain`, unlike every other `tenants.domain` write site

**Bug found:** `settings/route.ts`'s PUT handler is a BLOCKLIST (`delete body.id`, `delete body.status`, plus a short `systemOnlyFields` strip — everything else flows straight into the blind `tenants` UPDATE), unlike the ALLOWLIST-based admin routes (`admin/businesses` POST, `admin/businesses/[id]` PUT, `admin/tenants/[id]` PUT) that already special-case `domain` with a normalize + `findDomainOwner` collision guard (see `domains.ts`'s `findDomainOwner` doc comment — the whole reason that guard exists). Being a blocklist, `domain` was never special-cased here: it sailed through raw and uncollision-checked.

**Concrete failure mode:** worse than the three admin routes, this one is reachable by any TENANT owner/admin via their own dashboard (`requirePermission('settings.edit')` — no platform-admin gate). Any tenant could set its own `domain` to a host already claimed by ANOTHER tenant (via `tenant_domains` or that tenant's legacy `tenants.domain`), tripping the resolver's TRANSITION ASSERT-AND-REFUSE divergence guard (`getTenantByDomain` in `tenant.ts`/`tenant-lookup.ts`) on the very next request to that host and darkening the OTHER, already-live tenant's site — the same brand-swap/site-darkening failure mode already fixed for the admin write sites, reached through the one write site that was never audited for it because it isn't admin-only.

**Fixed:** normalize `domain` (lowercase, strip protocol/path/www) and run the same `findDomainOwner(cleanDomain, tenantId)` guard as the admin routes before writing; reject 409 on collision. Also bust `tenant-lookup.ts`'s edge cache (`invalidateTenantCache` + `invalidateDomainCache`) when domain changes — mirroring `admin/businesses/[id]` PUT's existing fix for the same staleness gap, which this route had neither of before. `domain_name` stays raw (display-only, not what the resolver queries), matching the admin routes' own precedent.

## (2) — continuing the surface (1) opened up: the SAME blocklist gap also let a tenant-supplied `slug` write through unblocked

Once `domain` was confirmed as a blocklist gap, the natural next question was whether any OTHER field this route accepts is normally treated as immutable/guarded everywhere else in the app but isn't blocked here. `slug` is that field: it's the subdomain-routing key (`getTenantBySlug` in `tenant-lookup.ts`, UNIQUE NOT NULL at the DB level per `supabase/schema.sql`), and neither admin PUT route (`admin/businesses/[id]`, `admin/tenants/[id]`) includes `slug` in its allowlist — confirmed by reading both routes' `allowed` arrays end to end. Nothing anywhere else in the app ever mutates `slug` post-creation.

**Concrete failure mode:** `dashboard/settings/page.tsx`'s `saveTenant()` sends `JSON.stringify(form)`, where `form` is seeded from GET's unfiltered `data.tenant` response — so `slug` round-trips, unchanged, on every normal save. A crafted request changing it would silently repoint the tenant's live subdomain (`<slug>.fullloopcrm.com`) with none of the upkeep a real slug change would need: busting `tenant-lookup.ts`'s `slugCache` for both the OLD slug (stays warm-cached to this tenant for up to 5 min) and a NEWLY-claimed slug that happens to be negatively cached from a prior probe (stays 404ing for up to 5 min despite the row now existing) — the same negative-cache class of gap already fixed for domains (`invalidateDomainCache`), never wired up for slug because slug was never supposed to be editable here at all.

**Fixed:** `delete body.slug` alongside the existing `id`/`status` strip — the minimal, correctly-scoped fix given slug has zero legitimate edit path anywhere else in the codebase (no normalize/collision/cache-invalidation machinery to build; the field simply shouldn't be writable through this route).

**Swept for further siblings:** re-read the full `Tenant` type (`tenant.ts`) against this route's blocklist. No other field carries a uniqueness constraint, a cache keyed on it, or an admin-route allowlist that excludes it the way `domain`/`slug` do — `resend_domain`, `email_from`, etc. are tenant-owned config with no cross-tenant collision surface. Nothing else "opens up" from this surface.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–16, 21, 23, unchanged (see prior rounds' docs for full list, most recently restated in `w2-tenant-health-cron-status-gate-gap-2026-07-18-0306.md`).

CLOSED this round:
26. ~~Self-service `PUT /api/settings` never collision-checked a tenant-supplied `domain` against `tenant_domains`/legacy `tenants.domain`, unlike every admin write site~~ — fixed above (1): `findDomainOwner` guard + cache invalidation wired in, matching the admin routes.
27. ~~The same route also let a tenant-supplied `slug` write through unblocked, with no field anywhere else in the app supporting a slug change~~ — fixed above (2): `slug` now stripped alongside `id`/`status`.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- `npx eslint src/app/api/settings/route.ts src/app/api/settings/route.domain-collision-guard.test.ts src/app/api/settings/route.slug-immutable.test.ts` — 0 errors, 0 warnings.
- New `route.domain-collision-guard.test.ts` — 6 tests: 409-rejects a cross-tenant collision (no write happens), WRONG-TENANT PROBE confirming the collision check excludes the requesting tenant's own id (never another tenant's), normalizes protocol/path/WWW/case before both the check and the write, allows the write + busts both caches when no collision exists, skips the domain machinery entirely when `domain` isn't part of the update, and confirms `domain_name` stays raw/uncollision-checked.
- New `route.slug-immutable.test.ts` — 2 tests: a direct attempt to change `slug` is stripped from the write, and a normal full-form save (slug round-tripped unchanged, as the dashboard always sends it) never writes slug either.
- Ran the full `src/app/api/settings/` suite (16 files, including the two new ones) together — 54 tests, all passed; no regressions in the pre-existing `route.primary-domain.test.ts`, `route.vendor-secret-redaction.test.ts`, `route.rbac.test.ts`, `route.selena-config-merge-race.test.ts`.
- Full repo suite: 705 files, 3002 passed, 37 skipped (pre-existing), 1 failed (`src/lib/finance-export.test.ts`'s 200k-row pagination test hit its 5000ms timeout under full-suite parallel-worker load — unrelated to this round's changes; re-ran that one file in isolation on the same commit: 3/3 passed in 1.55s, confirming a load-induced timeout flake, not a real regression). +7 passed vs. the prior round's 2995 — this round added 8 new tests (6 domain-collision-guard + 2 slug-immutable); the 1-test gap from the raw arithmetic isn't accounted for by anything in this round's diff and isn't being investigated further here (out of lane scope — file counts also moved +2, consistent with other workers' concurrent commits on this shared branch).

File-only, no push/deploy/DB write from this worker. 2 code commits this round (domain-collision-guard fix + tests; slug-immutable fix + tests) + 1 docs commit (this file).
