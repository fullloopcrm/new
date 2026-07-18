# W2 gap/fluidity refresh — 2026-07-17 23:00

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-referral-portal-hardcoded-commission-copy-gap-2026-07-17-2252.md`.

Leader's instruction this round (22:53 LEADER->W2): fresh 3-deep queue -- (1) new fresh-ground surface. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: SEO backlink/citation engine picked a non-deterministic tenant_domains row instead of the actual primary domain

Surveyed surfaces with zero dedicated deploy-prep coverage by grepping `.domain` reads across `src/app`/`src/lib` and cross-checking against every prior round's filename. `src/lib/seo/backlinks.ts` (the citation-directory + editorial cross-mention proposal generator behind `/api/cron/seo-backlinks` and `/api/admin/seo/backlinks`) had never been touched by this lane and has no `*.domain-fallback.test.ts` counterpart.

`loadActiveFleet()`'s tenant_domains query was `.select('domain,tenant_id').eq('active', true)` — no `is_primary`, no ordering at all. It built `byTenant` by taking whichever row Postgres happened to return first per `tenant_id` and skipping every subsequent row for that tenant (`|| byTenant.has(tenantId)) continue`). This is exactly the non-deterministic-primary-pick bug class already fixed twice this lane (`referrers/[code]`, `site-export`, commit `29dcd2e3`) via `getPrimaryTenantDomain()` in `src/lib/domains.ts` — oldest `is_primary` row wins, falls back to the oldest active row when none is flagged. This file re-implemented its own ad-hoc (and materially worse — no ordering/precedence at all) version instead of using that established resolver.

**Concrete impact:** a tenant mid-rebrand (old domain kept active for redirects, new domain flagged `is_primary`) or with a neighborhood-scoped domain alongside its primary has 2+ active `tenant_domains` rows. Postgres gives no ordering guarantee on an unordered select, so `loadActiveFleet()` could non-deterministically pick the stale/wrong domain on any given cron run. That wrong domain then flows into: the citation listing description ("Book online at {wrong-domain}"), the `website` field handed to `manualStepsFor()`'s human-submission checklist, the `sc-domain:{wrong-domain}` property key stored on every proposed row, and every editorial anchor-text option. These are real citation listings a human manually submits to Yelp/BBB/Angi/HomeAdvisor/etc. per the generated checklist — unlike an in-app display bug, an external directory citation pointing at the wrong domain is expensive to notice and correct after the fact (someone has to go re-edit the listing on each third-party platform).

**Fixed:** `loadActiveFleet()` now selects `domain, tenant_id, is_primary, created_at`, orders by `created_at` ascending, groups rows per tenant, then reduces with the identical precedence as `getPrimaryTenantDomain()` (`rows.find(is_primary) ?? rows[0]`). Single query, no N+1 — the existing tenants.domain fallback pass (for tenants with zero `tenant_domains` rows at all, per `activate-tenant.ts`'s best-effort upsert) is untouched.

Tests: 2 new cases in `backlinks.test.ts`'s `loadActiveFleet()` block — (a) 2 active rows, older one NOT primary and newer one IS primary, asserts the primary (not the row-order-first) domain wins — the wrong-tenant-probe-equivalent for this bug class, since it would have failed against the pre-fix code; (b) neither row flagged primary, asserts the oldest row wins (matches `getPrimaryTenantDomain()`'s own documented tiebreak). Also added a no-op `.order()` method to the file's mock chain builder (it had none — the query never called `.order()` before this fix) following the same no-op convention already established in `domains.test.ts`.

## (2) — continuation

Nothing further opened up: `loadActiveFleet()` was the only tenant-domain read in this file (the tenants.domain fallback query at the bottom of the same function was already correct — confirmed by existing passing tests, not touched). No other caller in `src/lib/seo/*` reads `tenant_domains` directly.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items, unchanged:
1. `tenant_domains` DELETE/reactivate gap — still open, still gated on Jeff's product call.
2. `lib/tenant-schema.ts` — still confirmed dead code.
3. `platformFallback` compliance question (JEFF-MORNING-QUEUE.md) — still open.
4. `bookings/batch/route.ts`'s platform-fallback anomaly — still gated on #3.
5. `finance/upload/route.ts`'s MIME gap — fixed elsewhere (`p1-w4`, commit `5af092d2`), pending merge into `p1-w2`. No change.
6. Existing referrers' `commission_rate` rows stuck at signup-time value; no PUT/PATCH to edit post-signup, no backfill of pre-fix hardcoded-10% rows. Product/business decision, not acted on.

NEW this round: none — the fix in (1) was small enough to close outright.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged:
7. `dashboard/referrals/page.tsx`'s referrals-tab copy overpromises per-referrer rate control that doesn't exist. Not changed — copy-only UX call, flagging rather than acting.

Verification: `npx vitest run src/lib/seo/backlinks.test.ts` (32/32 pass, incl. 2 new), `npx tsc --noEmit` clean, `npx eslint src/lib/seo/backlinks.ts src/lib/seo/backlinks.test.ts` (0 errors — 2 pre-existing unused-arg warnings on the mock's untouched `not()` stub params, not introduced by this change). **Not re-run:** full repo test suite (targeted suite only, per cost-aware scope — no changes outside `src/lib/seo/backlinks.ts`/`.test.ts`). File-only, no push/deploy/DB.
