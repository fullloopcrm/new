# W2 gap/fluidity refresh — 2026-07-17 23:42

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-tenant-delete-cache-invalidation-gap-2026-07-17-2326.md`.

Leader's instruction this round (23:31 LEADER->W2): confirmed last round's tenant-delete cache-bust + negative-cache slug-reuse-window find as real, then fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: legacy `tenants.domain` writes never busted the NEGATIVE domain cache

Last round closed the negative-cache gap for **slugs** (tenant delete → `invalidateSlugCache`). This round found and closed the symmetric gap on the **domain** side, but for a different write path than the one already fixed (`admin/websites` POST, which inserts into `tenant_domains` and already calls `invalidateDomainCache` correctly). The gap was in the 3 call sites that write the LEGACY `tenants.domain` fallback column instead:

1. `PUT /api/admin/businesses/[id]` — onboarding-fields handler
2. `PUT /api/admin/tenants/[id]` — brand/config fields handler
3. `POST /api/admin/businesses` — tenant creation

All 3 normalize the incoming domain string correctly and call `invalidateTenantCache(id)` when `domain` changes — but `invalidateTenantCache` only sweeps **positive** cache entries (it matches `entry.tenant?.id === tenantId`; a negative `{tenant: null}` entry has no `.id` to match — same structural limitation documented in `tenant-lookup.ts`'s own comment, and the exact reason `invalidateDomainCache`/`invalidateSlugCache` exist as direct-by-key busters). None of the 3 call sites ever called `invalidateDomainCache(cleanDomain)`.

**Concrete impact:** `tenants.domain` is the resolver's FALLBACK source (`getTenantByDomain` step 2, used when no active `tenant_domains` row exists for the host). If a given host was ever queried — and negatively cached — before an admin set/created a tenant with that exact domain (a DNS-not-pointed-yet probe, a bot, an admin testing the URL early during onboarding), the domain kept resolving to "no tenant" for up to the rest of the 5-minute TTL despite the write making it a real, live domain. Worse for POST (creation): `invalidateTenantCache` is *always* a no-op there too, since a brand-new tenant has no prior positive cache entry to sweep — the only bust that could ever help is the direct-by-domain one, which didn't exist.

**Fixed:** all 3 call sites now also call `invalidateDomainCache(cleanDomain)` (no-op when the domain was cleared/absent — nothing to bust for a null domain).

## Second bug found in the same block: www.-strip ORDER bug in tenant creation

While writing the negative-cache test for `POST /api/admin/businesses`, the "mixed-case www." case didn't produce the expected result — traced it to the normalization itself, not the cache fix. `cleanDomain` there ran:

```
.replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '').toLowerCase().trim()
```

www.-strip BEFORE lowercasing. The regex is case-sensitive, so a completely ordinary paste like `https://WWW.Acme.com/` never matched `/^www\./` at that point in the chain (still `"WWW."`) — it survived into the lowercased result as `"www.acme.com"` instead of `"acme.com"`. The resolver (`tenant-lookup.ts` / `tenant.ts` `getTenantByDomain` step 2) always lowercases FIRST, then strips www. — normalizing any real request Host header down to the bare apex. A tenant created this way could **never resolve its own custom domain at all**: no real request ever produces `"www.acme.com"` after the resolver's own normalization runs. This is more severe than the cache-bust gap it was found alongside — not a timing window, a permanent dead domain.

Both PUT handlers (`admin/businesses/[id]`, `admin/tenants/[id]`) already had the correct order (lowercase first) — only the creation path (`admin/businesses` POST) had it backwards. Reordered to match.

**Fixed:** `POST /api/admin/businesses`'s `cleanDomain` now lowercases before stripping www., matching the PUT handlers and the resolver.

## (2) — continuation: swept for other `tenants.domain` write sites

Grepped every `.insert(`/`.update(` block across `src/app/api` and `src/lib` that sets a `domain:` key. Confirmed the only 3 call sites that write the actual `tenants.domain` column are the 3 fixed above — no 4th site missed. (`attributed_domain`, `source_domain`, `resolved_domain`, etc. are unrelated columns on other tables — booking/lead attribution tracking, not the resolver's domain field.)

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval; LEADER runs it, not this worker.

NEW this round: none carried forward — both fixes in (1) were scoped and closed outright.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
8. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, all 3 touched route files + 4 new test files).
- `npx eslint` on all 7 touched/added files — 0 errors (1 pre-existing unrelated warning: unused `getDefaultServices` in `admin/businesses/route.ts`, predates this change).
- 4 new test files, 25 new tests total (17 for the cache-bust gap across 3 call sites incl. WRONG-TENANT/WRONG-DOMAIN probes, 8 for the www.-order bug), plus the 8 pre-existing tests in the same 2 directories (`route.domain-normalization.test.ts` ×2, `route.delete-cache-invalidation.test.ts`, `route.tenant-domains-fresh-ground.test.ts`, `route.cache-invalidation.test.ts`, `route.vendor-secret-redaction.test.ts` ×2, `route.status-enum-probe.test.ts` ×2, `route.pin-hash-redaction.test.ts`) — 25 files / 140 tests in `admin/businesses` + `admin/tenants` + `tenant-lookup.test.ts` + `lib/domains*`, all passing, 0 regressions.
- Both fixes mutation-verified individually per call site (3 cache-bust sites + 1 normalization-order site = 4 reverts): each reverted change made its own new test go RED for the right reason (wrong/missing `invalidateDomainCache` call, or `"www.acme.com"` instead of `"acme.com"`), restored GREEN with the fix reapplied.
- Full repo suite: 680/680 files, 2916/2953 tests pass (37 pre-existing skips), 0 failures, 0 regressions.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (all 3 cache-bust fixes + the www.-order fix + 4 test files, bundled — same root-cause code block, same round) + 1 docs commit.
