# W2 gap/fluidity refresh — 2026-07-17 23:10

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-seo-backlinks-primary-domain-precedence-gap-2026-07-17-2300.md`.

Leader's instruction this round (22:58 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: 5 tenant-status write paths never busted tenant-lookup.ts's 5-min resolver cache

Different bug class from the last several rounds' non-deterministic-primary-domain finds. Surveyed every `.from('tenants').update(...)` call site in `src/app` and `src/lib` (not just `tenant_domains` readers — the resolver-precedence class looked exhausted after last round's clean re-audit and this round's own re-check found no new instance of it) and cross-checked each `status`-writing call site against every file that already calls `invalidateTenantCache()`.

`tenant-lookup.ts`'s `getTenantByDomain()`/`getTenantBySlug()` cache tenant rows (including `status`) for 5 minutes. `middleware.ts` gates serving on `tenantServesSite(tenant.status)` evaluated against that cached value. `invalidateTenantCache(tenantId)` exists specifically to bust both caches after a status-changing write — it was added in an earlier round (`748c086b`, "tenant-lookup.ts's 5-min edge cache had no invalidation path") and wired into `admin/tenants/[id]` and `admin/businesses/[id]`'s own status writes. But those are only 2 of 7 real production write sites that mutate `tenants.status` — the other 5 were never wired in:

1. `api/admin/tenants/route.ts` PATCH — the list-level admin status toggle (has its own dedicated `route.status-enum-probe.test.ts`, so a real, exercised endpoint — not dead code).
2. `api/admin/sales/route.ts` PUT (general status/plan edit) and POST (sales-pipeline "activate" action).
3. `api/dashboard/onboarding/activate/route.ts` POST — the tenant-facing "Go live" button; its own doc comment calls this "an explicit, gated action."
4. `lib/accept-invite.ts` — flips a tenant `setup` → `active` the moment an owner accepts their invite.
5. `lib/activate-tenant.ts` — the highest-impact site: this file's own header comment calls it **"the ONE path every creation door should ultimately funnel through."** It already busts the DOMAIN cache per landed `tenant_domains` row (`invalidateDomainCache`, a few lines above the status flip) but never busted the TENANT status cache for its own final `status: 'active'` update.

**Concrete impact:** a tenant suspended/cancelled via the sales pipeline or the admin list view keeps fully serving its site/dashboard for up to 5 more minutes on any warm edge isolate that already resolved it. Worse in the other direction: a tenant just activated via `activate-tenant.ts` (the main flow), the "Go live" button, or accepting their invite can have their own freshly-live site still 404/refuse-to-serve for up to 5 minutes immediately after the UI reports success — directly undermining the point of the action they just took. Same class, same fix, as the 2 call sites already patched; this round's find is that the invalidation hook was never wired into the other 5.

**Fixed:** all 5 files, same pattern as the 2 existing call sites — dynamic `import('@/lib/tenant-lookup')` (or the relative `./tenant-lookup` inside `lib/`), call `invalidateTenantCache(tenantId)` immediately after the status write succeeds (or, for `admin/sales` PUT, only when `status` was actually part of the update — a plan-only edit doesn't need a cache bust).

Tests: 1 new file per touched production file (5 total, `*.cache-invalidation.test.ts`, kept separate from each file's existing test file per this lane's established one-bug-class-per-file convention), each a wrong-tenant-probe-equivalent asserting `invalidateTenantCache` is called with the EXACT tenant id on a successful status write, and NOT called when no status write happened (rejected status, plan-only edit, mismatched invite identity). `activate-tenant.ts`'s test is the heaviest lift — it had no prior test file at all, so this also seeds one, driving the full `activateTenant()` pass (gate passes, owner exists, carrying domain registers) to the terminal status-flip branch.

## (2) — continuation

Nothing further opened up: grepped every other `.from('tenants').update(` call site in the repo (billing/plan/notification-preference/settings/PIN/geo fields, Stripe webhook billing_status, Google OAuth token storage, provision-tenant.ts's idempotent seed updates) — none of them write `status`, so none of them are in scope for this cache (`tenantServesSite()` only reads `status`; the cache's other fields — slug, domain, P1 routing metadata — are separately busted where they're written, per the existing `admin/websites` POST / `admin/tenants/[id]` PUT coverage). No other status-writing site left.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval per the migration's own header; LEADER runs it, not this worker.

NEW this round: none — the fix in (1) was scoped and closed outright across all 5 sites.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
8. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

Verification: `npx vitest run` on all 5 new test files (9/9 pass) plus the 4 existing test files whose production code I touched (`accept-invite.test.ts`, `admin/tenants/route.status-enum-probe.test.ts` + `.vendor-secret-redaction.test.ts`, `dashboard/onboarding/activate/route.rbac.test.ts`) — 18/18 pass, no regressions. `npx tsc --noEmit` clean across the whole platform. `npx eslint` on all 10 touched/added files — 0 errors (1 pre-existing `prefer-const` warning on `admin/sales/route.ts` line 20, a line I did not touch, not introduced by this change). **Not re-run:** full repo test suite (targeted suites only, per cost-aware scope). File-only, no push/deploy/DB — the DB-side single-primary migration from a prior round remains the only DB artifact awaiting Jeff's approval, untouched this round.
