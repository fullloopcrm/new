# W2 gap/fluidity refresh — 2026-07-18 00:24

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-seo-ingest-linktenant-active-filter-gap-2026-07-18-0010.md`.

Leader's instruction this round (00:16 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `domains.ts`'s `getOwnedDomainSet()` never consulted the legacy `tenants.domain`/`domain_name` columns, only `tenant_domains`

`isOwnedReferrer()` (`lead-filters.ts`) uses `getOwnedDomainSet(tenantId)` to decide whether a lead's referrer host is the tenant's OWN site (a self-referral, not real inbound traffic) vs an external source. The set was built exclusively from `tenant_domains` rows — a tenant whose site still lives only at the legacy `tenants.domain`/`domain_name` (not yet migrated to `tenant_domains`) got an EMPTY owned-domain set, so a visit from their own domain would misclassify as an external referrer instead of being recognized as their own site.

**Deliberately a UNION, not a first-wins fallback** like `getPrimaryTenantDomain()`/`getTenantByDomain()` — those resolve "which ONE host serves this tenant right now" (a single winner). This helper answers "which hosts count as this tenant's own" (a membership check), so a tenant already migrated to `tenant_domains` can still have a live (or recently live) legacy `tenants.domain` and BOTH should count as owned — dropping either would misclassify real self-referral traffic.

**Fixed:** `getOwnedDomainSet()` now also queries `tenants.domain`/`domain_name` for the tenant, normalizes each the same way as every other resolver in this family (lowercase, strip protocol/path/www), and adds both the bare host and its `www.` variant to the set alongside the `tenant_domains` rows. Errors on the new query are thrown loud (not masked), matching this file's existing `getTenantDomains`/`getNeighborhoodFromZip` pattern.

**Honesty note (not overstating impact):** swept for callers before fixing. `isOwnedReferrer` (the shared, global `lead-filters.ts`) has ZERO live callers anywhere in the app today — `attribution.ts` imports only `isSearchReferrer` from the same file; `isSpamReferrer`, `isAdminReferrer`, `isOwnedReferrer`, `isBotUserAgent`, `isBlockedPage`, `isCleanClick`, `isEngagementAction`, and `findRealVisitorIds` are all unreferenced exports. Fixing this now anyway, consistent with this lane's standing practice (see carried-forward #1 below) of closing a resolver's precedence gap before it becomes reachable rather than after — the state (a tenant_domains-only owned-set for a legacy-only tenant) is real and would misfire the moment this module gets wired into a live route.

## (2) — continuation: swept for sibling instances of the same "union with legacy domain" gap

- Grepped every reference to `getOwnedDomainSet`/`ownedDomains`/`OWNED_HOSTS`/self-referral concepts repo-wide. Confirmed:
  - The three bespoke per-tenant clones (`site/nyc-mobile-salon`, `site/wash-and-fold-hoboken`, `site/wash-and-fold-nyc`) each have their OWN `_lib/lead-filters.ts` with a hardcoded `OWNED_HOSTS` constant (not DB-backed at all) — a different architecture, not subject to this exact bug, and explicitly "known debt, do not extend" per this repo's `CLAUDE.md` (per-tenant clones slated for migration to global, not feature work).
  - `admin/businesses/[id]/route.ts`'s `ownedDomains` (line 507) is the unrelated pre-delete Vercel-detach read, already confirmed intentionally unfiltered in an earlier round's sweep.
  - No other caller of `getOwnedDomainSet` exists; no other DB-backed "is this tenant's own domain" set-builder exists in the codebase.
- Checked planning docs (`*.md` at repo root) for any reference to `lead-filters`/`isOwnedReferrer`/`getOwnedDomainSet` — none found. No documented plan to wire this module up imminently; flagging as a NOTICED item below rather than acting further (wiring a dead module into a live route is a feature decision, not a bug fix).

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. No `[id]`-scoped route exists for deleting/deactivating/reassigning an individual `tenant_domains` row; `POST` (create) is the only write endpoint.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval; LEADER runs it, not this worker.

NEW this round:
8. `src/lib/lead-filters.ts` (the shared, global module) is ~90% dead code — 7 of its 8 exports (`isSpamReferrer`, `isAdminReferrer`, `isOwnedReferrer`, `isBotUserAgent`, `isBlockedPage`, `isCleanClick`, `isEngagementAction`, `findRealVisitorIds`) have zero live callers; only `isSearchReferrer` is wired (into `attribution.ts`). Meanwhile three tenants (`nyc-mobile-salon`, `wash-and-fold-hoboken`, `wash-and-fold-nyc`) each maintain their OWN hardcoded-`OWNED_HOSTS` copy of this same logic instead of using the shared, DB-backed version. Open product/architecture question, not acted on: should the global `client-analytics`/lead-quality surface wire up the shared module's dead exports, and should the 3 bespoke clones migrate to it (consistent with this repo's stated global-over-per-tenant-clone architecture rule)? Flagging rather than acting — this is a feature/migration decision, not a bug.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
9. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 5 new tests added to `src/lib/domains.test.ts`'s `getOwnedDomainSet` describe block: union-of-both-sources, legacy-only-tenant-falls-back probe, empty-when-neither-source-has-a-domain, cross-tenant probe (a domain belonging only to a different tenant never appears in this tenant's owned set), and a masked-error probe on the new legacy-lookup query. All pass; existing 3 tests in the same describe/file unaffected (24/24 total in the file).
- Mutation-verified: reverted the fix via `git diff > patch && git apply -R patch` on just `domains.ts`, re-ran the suite — the 3 new behavior-dependent probes failed for the right reason (empty set instead of the legacy fallback; silent swallow instead of throw on the new query's error). Reapplied, back to green (24/24).
- Full repo suite: 2923 passed, 37 skipped, 1 failed (`finance-export.test.ts`'s 200k-row pagination test — a 5s timeout under full-suite parallel load, unrelated to this change). Re-ran that file in isolation: 3/3 passed in 2.56s. Confirmed pre-existing flake, not a regression from this round's change.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (the fix + 5 new tests, same file pair) + 1 docs commit.
