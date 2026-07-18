# W2 gap/fluidity refresh — 2026-07-17 21:45

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-comhub-voice-fromnumber-plus-profile-readiness-2026-07-17-2130.md`.

Leader's fresh 3-deep queue this round (21:32 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: tenant-lookup.ts's edge cache had no invalidation path

The sms_number/telnyx_phone and tenant_domains/tenants.domain resolver-precedence bug classes are both exhaustively closed (confirmed by re-grepping every raw `telnyx_phone`/`sms_number`/`.eq('domain'` read across the repo and cross-referencing against every `resolver-precedence`/`fresh-ground`/`security(tenant-scope)` commit that's ever touched those files — nothing unswept found). Pivoted to a different angle on the same lane: `middleware.ts` + callers' actual tenant-resolution *mechanics*, not just column precedence.

Found the resolver's caching layer, not its query logic, has a gap. `tenant-lookup.ts` (the edge-compatible resolver `middleware.ts` uses for every subdomain/custom-domain request) keeps an in-memory `slugCache`/`domainCache` with a 5-minute TTL — but exports **no invalidation function at all**. Compare to the established pattern for exactly this shape of problem: `selena-legacy.ts`'s `configCache` (also TTL-based) is busted via `clearSelenaConfigCache(tenantId)`, called from `admin/businesses/[id]/route.ts`'s PUT handler whenever `selena_config` is touched (lines 413-420, pre-existing). The SAME PUT handler writes `tenants.status` and `tenants.domain` — both fields `tenant-lookup.ts` caches — with zero cache-bust call. The precedent for "bust this exact class of cache on write" already exists in this file; it just wasn't applied to the tenant resolver's own cache.

**Concrete impact, two directions:**
- **Suspension doesn't take effect immediately.** `tenantServesSite(tenant.status)` in `middleware.ts` gates whether a tenant's site (and PIN-authed `/admin`→`/dashboard` rewrite) keeps serving. An admin suspending/cancelling a tenant via `PUT /api/admin/tenants/[id]` or `PUT /api/admin/businesses/[id]` updates the DB immediately, but any edge isolate that already cached that tenant's slug/domain entry keeps serving the STALE (pre-suspension) status for up to the rest of the 5-minute TTL — the exact gate this codebase has hardened everywhere else (middleware, `tenant.ts`, `tenant-query.ts` all enforce `tenantServesSite` on fresh DB reads) silently doesn't apply to warm edge workers.
- **A newly-registered domain doesn't route immediately.** `getTenantByDomain` negatively caches "no tenant found" (`null`) same as a positive hit. A domain that was ever queried before being claimed (a curious visitor, a bot, a premature DNS point) gets a negative-cache entry; when an admin then registers it (`admin/websites` POST, or `activate-tenant.ts`'s auto-registration on tenant activation — the SAME function whose stale-primary-domain bug was fixed last round, commit `4a8211e1`) the DB row exists correctly but the cached `null` keeps winning for up to the rest of the TTL, so the tenant's own just-added domain 404s/falls through to the wrong host on a warm isolate.

**Fixed:** added `invalidateTenantCache(tenantId)` (sweeps both `slugCache` and `domainCache`, deleting any entry whose cached tenant matches — a tenant can have multiple `tenant_domains` rows plus a slug, all keyed independently, so a single-key delete isn't enough) and `invalidateDomainCache(domain)` (busts one domain key directly, same lowercase+www-strip normalization `getTenantByDomain` uses, so the key actually matches). Wired into:
- `admin/tenants/[id]/route.ts` PUT — `invalidateTenantCache(id)` when `status` or `domain` changed.
- `admin/businesses/[id]/route.ts` PUT — same, placed right next to the existing `clearSelenaConfigCache` bust for symmetry.
- `admin/websites/route.ts` POST — `invalidateDomainCache(cleanDomain)` after a successful `tenant_domains` insert.

## (2) — continuation: same fix applied to activate-tenant.ts's own domain auto-registration

`activate-tenant.ts` (already the subject of last round's stale-primary-demotion fix) upserts `tenant_domains` rows for the carrying domain + custom domain on tenant activation, then reads back which domains actually "landed" on this tenant (`landedDomains`). Same negative-cache gap as `admin/websites` POST, reached through a second call site. Added the identical `invalidateDomainCache()` call for each domain in `landedDomains` right after that list is computed — before the existing `is_primary` reconciliation step, so a freshly-activated tenant's domain routes immediately instead of only after the TTL clears.

Considered but left out of scope: `domains.ts`'s `reconcilePrimaryDomain()` (flips `is_primary` between rows) doesn't need a cache bust — `is_primary` isn't a field `TenantInfo` caches, and changing which domain is primary for a tenant doesn't change either domain string's tenant_id mapping (both already resolve to the same tenant before and after). No other write path to `tenant_domains`/`tenants.domain`/`tenants.status` found beyond the four already covered (re-confirmed via `grep -rln "from('tenant_domains')"` across `platform/src`, cross-checked each file's write vs. read-only usage).

Tests: 8 new tests in `tenant-lookup.test.ts`, following the file's existing unique-domain-per-test convention (no `vi.resetModules()` needed since module-level cache state doesn't collide across tests using distinct keys):
- `invalidateTenantCache`: cached-domain re-query, WRONG-TENANT PROBE (invalidating tenant A must not evict tenant B's cached entry), cached-slug re-query (slugCache path, not just domainCache), no-op-when-nothing-cached.
- `invalidateDomainCache`: cached-domain re-query, negative-cache-clear probe (the exact bug — a domain that 404'd once before being registered would otherwise keep 404ing), www/case normalization matches `getTenantByDomain`'s own.

Mutation-verified: stubbed both functions as no-ops, RED (6 failures — all and only the 6 new tests exercising invalidation behavior; the other 19 pre-existing tests in the file stayed green, confirming no collateral breakage from the stub), then restored the real implementation, GREEN (25/25). `tsc --noEmit` clean, `eslint` 0 new warnings on all 6 touched files, full suite 666/666 files, 2855/2892 tests (37 pre-existing skips), 0 regressions.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. (Relevant new context: this is also *why* the cross-tenant domain-reassignment direction of the cache bug isn't currently reachable — `tenant_domains.domain` is DB-unique and there's no delete/reassign endpoint, so a domain can never actually move from tenant A to tenant B through the app today. The cache bug is real but currently only reachable in the two directions fixed above, not a third "domain silently served under the wrong brand" direction — worth re-checking if/when the DELETE gap closes.)
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3. Re-confirmed present and unchanged this round (re-grepped `telnyx_phone` reads specifically hunting for anything new; this is the one pre-existing case that surfaced, already known).
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.

NEW this round: none deferred — both findings above were fixed in-round.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.

Verification: `tsc --noEmit` clean, `eslint` 0 new warnings, full suite 666/666 files, 2855/2892 tests (37 pre-existing skips), 0 regressions, run after both fixes together. File-only, no push/deploy/DB. Commit: `748c086b` (cache-invalidation fix, incl. this doc's (1) and (2)).
