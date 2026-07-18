# W2 gap/fluidity refresh — 2026-07-17 23:26

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-status-cache-invalidation-gap-2026-07-17-2310.md`.

Leader's instruction this round (23:12 LEADER->W2): confirmed last round's 5-write-path cache-invalidation find as real, then fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: DELETE /api/admin/businesses/[id] never busted tenant-lookup.ts's resolver cache at all

Last round closed all 7 known `tenants.status`-writing call sites against `invalidateTenantCache()`. This round audited the one remaining write shape not yet covered by that sweep: the tenant **DELETE** path — `DELETE /api/admin/businesses/[id]/route.ts` (confirmed via grep the only tenant-delete endpoint in the app; `admin/tenants/[id]` and `admin/tenants/route.ts` have no DELETE handler). A hard delete is a strictly bigger write than a status/domain edit — it removes the row those edits merely change — so it should need the cache bust at least as much. It never got one. Its own sibling PUT handler, twenty lines above it in the SAME file, already calls `invalidateTenantCache(id)` on every status/domain write (`748c086b`); the DELETE handler below it does the full hard delete (`tenants` row + cascaded `tenant_domains` rows per `043_tenant_domains.sql`) and returns without ever importing `tenant-lookup.ts`.

**Concrete impact, two directions:**
- **A deleted tenant keeps serving.** Any subdomain/custom-domain request that already warmed this tenant's `slugCache`/`domainCache` entry before the delete keeps resolving to the (now nonexistent) tenant's stale cached row for up to the rest of the 5-minute TTL — `tenantServesSite(tenant.status)` evaluates the STALE (pre-delete) status, so the tenant's site and PIN-authed admin/dashboard keep serving after an admin hard-deleted the account, the exact class of gap the last several rounds closed for suspend/cancel, just reached through deletion instead of a status write.
- **Slug reuse inherits a stale cache, and `invalidateTenantCache` structurally can't fix it.** `invalidateTenantCache(tenantId)` sweeps both caches by matching `entry.tenant?.id === tenantId` — it can only ever evict a POSITIVE entry. A slug that resolves to "no tenant" gets cached as `{tenant: null, ...}` — no id to match, so calling `invalidateTenantCache` after a delete cannot reach it. Concretely: a bot/crawler/stale bookmark or SEO backlink hits `<slug>.fullloopcrm.com` moments after a delete → negatively cached. If the same business re-signs-up under the same name shortly after (a realistic "oops, redo the signup" or accidental-double-delete-then-recreate flow) — the new tenant's own subdomain would keep 404ing/falling through to the unauthenticated gate for up to the rest of the TTL, immediately after the new signup reports success. This is the SAME structural gap `invalidateDomainCache(domain)` was added to close for domains (`748c086b`'s own doc: "a domain that 404'd... before being claimed gets negatively cached") — the slug side of that exact fix was never given the symmetric treatment. No `invalidateSlugCache` function existed at all until this round.

**Fixed:**
1. Added `invalidateSlugCache(slug)` to `tenant-lookup.ts` — the `slugCache` counterpart to the existing `invalidateDomainCache(domain)`, same direct-by-key delete, same lowercase normalization as `getTenantBySlug`.
2. `DELETE /api/admin/businesses/[id]/route.ts` now captures `doomed.slug` (already read out pre-delete for the existing Vercel-detach step) and, right after the delete succeeds, calls `invalidateTenantCache(id)` (closes the positive-cache "deleted tenant keeps serving" gap) and `invalidateSlugCache(doomed.slug)` (closes the negative-cache slug-reuse gap `invalidateTenantCache` structurally cannot reach).

Domain-reuse is a separate question and already covered: `tenant_domains.domain` is globally unique, so a deleted tenant's domain string only becomes reusable via a NEW `tenant_domains` insert on `admin/websites POST`, which already calls `invalidateDomainCache(cleanDomain)` right after that insert (an earlier round's fix) — so the domain side of "reused by a different tenant" was already closed at write time. It's specifically the slug side, reachable at CREATE time via no comparable bust, that was open.

Tests: `tenant-lookup.test.ts` gets 5 new tests for `invalidateSlugCache` (fresh-read-after-invalidate, negative-cache-clear — the exact bug, case normalization, no-op-when-nothing-cached, WRONG-TENANT PROBE — invalidating one slug doesn't evict a different cached slug). New file `route.delete-cache-invalidation.test.ts` (kept separate from the existing `route.tenant-domains-fresh-ground.test.ts`, which already covers DELETE's Vercel-detach behavior, per this lane's one-bug-class-per-file convention) with 4 tests: busts `invalidateTenantCache` with the deleted tenant's id, busts `invalidateSlugCache` with the deleted tenant's own slug, a WRONG-TENANT PROBE (deleting A never touches B's cache), and a no-matching-row case (delete of a nonexistent id still fires the bust for the requested id, since Supabase's delete is a no-op-not-an-error on zero matches).

## (2) — continuation

Considered whether the same "no direct negative-cache buster" gap could recur elsewhere for slugs: the ONLY other place a brand-new slug is claimed is `POST /api/tenants` (onboarding tenant creation). That route's own slug-uniqueness check queries `tenants` directly (`supabaseAdmin.from('tenants').select('id').eq('slug', slug)`) rather than through `getTenantBySlug()` — it never touches `slugCache` at all, so it can't leave (or need to clear) a stale entry for the slug it's about to claim. No second call site needed the same fix.

Also double-checked: does the DELETE handler's own pre-delete reads (`doomed`, `ownedDomains`) themselves warm the cache and need a bust of THEIR read, not just the write? No — both use `supabaseAdmin.from(...)` directly (bypassing `tenant-lookup.ts` entirely), same as every other write-path read in this file; only `middleware.ts`'s `getTenantBySlug`/`getTenantByDomain` populate the cache.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval; LEADER runs it, not this worker.

NEW this round: none — the fix in (1) was scoped and closed outright.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
8. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

Verification: `npx vitest run` on the 2 new/touched test files plus the 6 other existing test files in the same directory (`route.tenant-domains-fresh-ground/.vendor-secret-redaction/.jsonb-merge-race/.seats-merge-race/.domain-normalization/.pin-hash-redaction.test.ts`) plus `tenant-lookup.test.ts` — 8 files, 60/60 pass, 0 regressions. `npx tsc --noEmit` clean. `npx eslint` on all 4 touched/added files — 0 errors. Full repo suite: 675/676 files, 2897/2935 tests pass (37 pre-existing skips); 1 unrelated pre-existing flaky timeout (`finance-export.test.ts`'s 200k-row pagination test, times out only under full-suite parallel load — confirmed by re-running it alone: 3/3 pass in 1.85s — not touched by this change). File-only, no push/deploy/DB.
