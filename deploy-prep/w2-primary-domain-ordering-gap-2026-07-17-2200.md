# W2 gap/fluidity refresh — 2026-07-17 22:00

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-lookup-cache-invalidation-gap-2026-07-17-2145.md`.

Leader's fresh 3-deep queue this round (21:51 LEADER->W2): (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

**Note on the LEADER order itself:** the order's headline finding — tenant-lookup.ts's edge cache having no invalidation path — was already fully fixed, tested, and documented last round (commits `748c086b`/`c72fd51c`, doc `w2-tenant-lookup-cache-invalidation-gap-2026-07-17-2145.md`). Verified the fix is live on this branch (`invalidateTenantCache`/`invalidateDomainCache` present in `tenant-lookup.ts`, wired into `admin/tenants/[id]`, `admin/businesses/[id]`, `admin/websites`, `activate-tenant.ts`) before doing anything else — did not redo it. Treated the order's actual instruction (find a NEW fresh-ground surface) as the live task.

## (1) — new fresh-ground surface: two call sites re-derive a non-deterministic primary-domain pick instead of using the hardened resolver

Re-swept the resolver lane from the "caching mechanics" angle used last round; this round's angle was duplication — independent, hand-rolled reimplementations of already-hardened resolver logic that don't share the fix. Grepped every `is_primary` read against `tenant_domains` across `platform/src` looking for anything that doesn't route through `domains.ts`'s `getPrimaryTenantDomain()`.

`domains.ts`'s `getPrimaryTenantDomain(tenantId)` exists specifically because an earlier round found that `.find(d => d.is_primary)` over an **unordered** `tenant_domains` select is non-deterministic once 2+ rows are ever flagged primary for the same tenant (Postgres gives no ordering guarantee on an unordered scan) — it fixed this with an explicit `.order('created_at', { ascending: true })` so the OLDEST primary row consistently wins, with a dedicated MULTI-PRIMARY DETERMINISM PROBE test in `domains.test.ts` covering exactly this.

Two call sites never adopted it and reimplement the same buggy pattern independently:
- **`app/api/referrers/[code]/route.ts`** (referrer earnings dashboard's `share_url`) — queried `tenant_domains` directly with no `.order()` and picked via `domainRows?.find((d) => d.is_primary)?.domain`.
- **`app/api/admin/businesses/[id]/site-export/route.ts`** (tenant site ZIP export's base URL) — same shape: unordered select, `.find((d) => d.is_primary)?.domain || domains[0]?.domain`.

**Concrete impact:** low-severity but real — if a tenant ever ends up with 2+ active `is_primary` rows (the write-path invariant added by `admin/websites` POST's demote-before-set should prevent new occurrences, but any row that predates that fix, or a future write path that slips past it, can still produce this state — this is exactly the scenario `getPrimaryTenantDomain`'s defense-in-depth exists for), these two call sites pick whichever row an unordered DB scan happens to return first — which domain shows on a referrer's share link, or which domain a site-export ZIP is crawled from, becomes non-deterministic per-request instead of consistently resolving to the oldest row like every other primary-domain consumer in the codebase.

**Fixed:** both now delegate to the canonical resolver instead of hand-rolling:
- `referrers/[code]/route.ts` — replaced the inline `tenant_domains` query + `.find()` with a single call to `tenantSiteUrl({ id, domain, slug })` (already imported in this file, and itself built on `getPrimaryTenantDomain`), which encodes the exact same precedence (tenant_domains PRIMARY -> tenants.domain FALLBACK -> slug host LAST) deterministically.
- `site-export/route.ts` — replaced the inline `tenant_domains` query + `.find()` with `getPrimaryTenantDomain(id)`, keeping its existing `tenants.domain` fallback branch unchanged.

Net effect beyond the ordering fix: both call sites' `tenant_domains` reads now surface a genuine DB error loud (via `getPrimaryTenantDomain`'s explicit error check / throw) instead of the previous silently-discarded-`error` pattern — consistent with the masked-error hardening already applied everywhere else in this lane.

Tests: 5 new —
- `referrers/[code]/route.primary-domain.test.ts` (new file, 4 tests): MULTI-PRIMARY PROBE (pre-sorted oldest-first input, as `getPrimaryTenantDomain`'s own `ORDER BY created_at asc` would return it — asserts the route surfaces that pick unchanged rather than re-deriving one), single-primary-domain case, tenants.domain fallback, slug-host fallback.
- `site-export/route.domain-fallback.test.ts` (+1 test): same MULTI-PRIMARY shape via the tenant-isolation-harness (seeded pre-sorted oldest-first — the harness's `.order()` doesn't actually sort, so the seed order stands in for "as the DB would return it").

Did not re-test `getPrimaryTenantDomain`'s own sort behavior — that's already covered by `domains.test.ts`'s dedicated MULTI-PRIMARY DETERMINISM PROBE; these new tests only cover the call sites now delegating to it correctly.

Verification: `tsc --noEmit` clean, `eslint` 0 new warnings on all 4 touched files, full suite 667/667 files, 2860/2897 tests (37 pre-existing skips, +5 new tests vs. last round), 0 regressions. File-only, no push/deploy/DB.

## (2) — continuation

No further surface opened up beyond the two call sites above — re-grepped every `is_primary` read against `tenant_domains` repo-wide (see command above); no third hand-rolled site found.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items unchanged from last round:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.

NEW this round: none deferred — the one finding above was fixed in-round.

## MISSING-FEATURE GAPS / UX-FRICTION

Nothing new this round.
