# W2 gap/fluidity refresh — 2026-07-18 00:10

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-resolveorigin-www-noop-fix-2026-07-17-2350.md`.

Leader's instruction this round (23:59 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: `seo/ingest.ts`'s `linkTenant()` was the one sibling resolver missing the active-row filter on `tenant_domains`

This codebase has three independent read-side mirrors of the canonical resolver's tenant_domains-first / tenants.domain-fallback precedence for SEO tenant-linking: `backlinks.ts`'s `loadActiveFleet()`, `onboarding.ts`'s `backfillUntrackedDomains()`, and `ingest.ts`'s `linkTenant()`. The first two both filter `.eq('active', true)` on their `tenant_domains` query and say so explicitly in their own comments. `linkTenant()`'s own comment claims the same precedence ("Same coverage gap already fixed in backlinks.ts/health.ts... matches tenant.ts's tenant_domains-first / tenants.domain-fallback precedence") but the query itself never filtered on `active`.

**Concrete impact:** `tenant_domains.domain` is globally UNIQUE (migrations/043_tenant_domains.sql) — deactivating a row doesn't free the domain string, it just flips `active` to false on the same row. Without the filter, a domain that's been deactivated/reassigned away from a tenant kept resolving `linkTenant()` to the STALE tenant_id forever (every new GSC property for that host would link to the wrong, no-longer-owning tenant) instead of correctly falling through to the `tenants.domain` legacy fallback (or `null` if neither source claims it) — diverging from every other resolver in this precedence family.

**Fixed:** added `.eq('active', true)` to `linkTenant()`'s primary query, matching `backlinks.ts`/`onboarding.ts`/`health.ts`.

## (2) — continuation: swept every `tenant_domains` read site repo-wide for the same missing-filter pattern

- Grepped all 19 `from('tenant_domains')` call sites. Confirmed:
  - `tenant-lookup.ts`, `tenant.ts`, `domains.ts` (`getPrimaryTenantDomain`), `backlinks.ts`, `onboarding.ts`, `health.ts`, `auto-verify.ts`, `cron/tenant-health/route.ts` — all correctly filter `active: true` where resolution semantics apply.
  - `admin/websites/route.ts`'s GET (admin domain-management list) and its UNIQUE-constraint 23505 conflict lookup — intentionally unfiltered; these need to see/report on inactive rows too, not resolve a live tenant.
  - `admin/businesses/[id]/route.ts`'s pre-delete Vercel-detach read — intentionally unfiltered; must capture and detach inactive domain rows too, not just active ones.
  - `activate-tenant.ts`'s writes and `domains.ts`'s other functions (`getTenantDomains`, `reconcilePrimaryDomain`, `getDomainsForNeighborhood`, `getNeighborhoodFromZip`) already filter or are write paths, not resolution reads.
  - `ingest.ts`'s `linkTenant()` was the only outlier. Fixed in (1); no second instance found.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call. No `[id]`-scoped route exists for deleting/deactivating/reassigning an individual `tenant_domains` row; `POST` (create) is the only write endpoint. (Note: this also means the exact `active: false` state `linkTenant()`'s bug required has no live UI path to reach yet — the fix in (1) is defense-in-depth against a state reachable today only via direct DB/script writes, not yet via the app. Still correct to fix now: the code's own comment already claimed this precedence, and the state becomes reachable the moment #1 ships.)
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.
7. `tenant_domains_single_primary` DB migration (partial unique index) — prepared as a file, not yet run. Gated on Jeff's approval; LEADER runs it, not this worker.

NEW this round: none carried forward — the fix in (1) was scoped and closed outright.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
8. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

## Verification this round

- `npx tsc --noEmit` clean (repo-wide).
- 2 new tests added to `src/lib/seo/ingest.test.ts` (inactive-row-falls-back-to-legacy probe, inactive-row-with-no-legacy-fallback-returns-null probe); existing 4 tests in the same file unaffected (6/6 total).
- Mutation-verified: reverted the fix via `git stash` on just `ingest.ts`, re-ran the suite — both new probes failed for the right reason (resolved to the stale `t-old` instead of `t-new`/`null`); reapplied, back to green.
- Full repo suite: 2920 passed, 37 skipped, 1 failed (`finance-export.test.ts`'s 200k-row pagination test — a 5s timeout under full-suite parallel load, unrelated to this change). Re-ran that file in isolation: 3/3 passed in 5.3s. Confirmed pre-existing flake, not a regression from this round's change.

File-only, no push/deploy/DB write from this worker. 1 code commit this round (the fix + 2 new tests, same file pair) + 1 docs commit.
