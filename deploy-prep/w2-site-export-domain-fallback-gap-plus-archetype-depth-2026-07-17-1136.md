# W2 gap/fluidity refresh — 2026-07-17 11:36

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-seomgr-domain-fallback-gap-plus-archetype-depth-2026-07-17-1127.md`.

Leader's fresh 3-deep queue this round (11:28 LEADER->W2): (1) continue project archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## (1) Fresh-ground — same resolver-precedence class, new direction: tenant_id -> domain (forward lookup)

Last round's fresh-ground find (seomgr's `linkTenant()`/`backfillUntrackedDomains()`) was the **domain -> tenant_id** direction of the resolver contract: a host resolving to the wrong/no tenant. This round's static sweep (every call site building a tenant's "primary domain" from `tenant_domains.is_primary`, plus every direct `tenant_domains`/`tenants.domain` query pair) turned up the **reverse** direction — a tenant_id resolving to the wrong/no domain — in a route this session's earlier `tenant.ts`/`tenant-lookup.ts`/`backlinks.ts`/`health.ts`/`ingest.ts`/`onboarding.ts` fixes never touched.

**`GET /api/admin/businesses/[id]/site-export`** (produces a downloadable static-site ZIP for the "you keep a copy of your site" ownership promise) queried `tenant_domains` only for the tenant's live public domain — no fallback to `tenants.domain`. A tenant live only via the legacy `tenants.domain` column (still normal: `tenant_domains` registration is best-effort per `activate-tenant.ts`'s try/catch upsert, and `POST /api/admin/websites` — the admin "add a website" panel — writes `tenant_domains` only, never `tenants.domain`) always 400'd `"No active domain found for this tenant — set a domain before exporting."`, even though their site is live and reachable, blocking the export/ownership feature outright for that tenant.

Swept every other site building a "primary domain" off `tenant_domains.is_primary` (the same query shape) to confirm this was the only unfixed instance: `cron/tenant-health/route.ts` already unions both sources explicitly (its own comment cites the resolver contract); `referrers/[code]/route.ts` already falls back to `tenant.domain` inline. `admin/websites/route.ts`'s `GET` (the admin listing of registered domains) does NOT fall back — a tenant with only `tenants.domain` set is invisible in that admin page — but that's a listing/visibility question (should a legacy-only tenant get a synthesized row in an admin domains list?), not a resolution failure with a user-facing error; flagging below as NOTICED rather than fixing unilaterally, consistent with this session's discipline on design-decision-shaped findings.

**Fix:** added the `tenants.domain` fallback to `site-export/route.ts`, same precedence as `getTenantByDomain()` (tenant_domains wins when present). 4 new tests (`route.domain-fallback.test.ts`) incl. a wrong-tenant probe (a second tenant's `tenant_domains` row must not leak into this tenant's fallback resolution) and the "neither source has anything -> still 400s" case. Mutation-verified: reverted via `git diff` + `git apply -R` (`git stash` disabled, shared `.git` dir across all 4 worker worktrees) — both fallback-dependent tests went RED for the right reason (400 instead of 200, the original bug exactly), reapplied, confirmed GREEN.

## (2) Archetype depth — 5a-46, proving the reverse direction against the live schema

Added **5a-46** to `platform/scripts/sim-all-trades.ts` (after 5a-45, before `5b. CHANGE ORDER`). 5a-44/5a-45 both probed the **domain -> tenant_id** direction; this is the first archetype-depth probe of the **tenant_id -> domain** direction the just-fixed route depends on. `requireAdmin()` gates the actual route handler behind a cookie-based admin session this harness doesn't hold (same constraint noted on 5a-38/5a-39's redaction probes), so this mirrors the route's own query pattern inline — deactivate the tenant's `tenant_domains` rows, seed `tenants.domain`, run the identical two-query fallback logic — against the REAL live schema rather than invoking the handler. Restores both tables' original state (this tenant is shared by every later phase in the run).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-46 (and the still-pending 5a-35 through 5a-45) pass before relying on them.**

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, both fixed/new files + `sim-all-trades.ts`).
- `npx eslint` on all touched/new files: 0 new warnings — the 3 `sim-all-trades.ts` warnings (`IndustryKey`, `COMMS_BY_KEY`, one `any` at line 2504) are the same pre-existing ones from prior rounds, nowhere near this round's insertion point.
- Full suite: 579/579 files, 2500/2500 tests passing (37 pre-existing skipped), zero regressions.
- Fix mutation-verified (`git diff` the fixed file + `git apply -R` to revert — confirmed the fallback tests go RED for the right reason, restored, confirmed GREEN).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-24), plus:

- **#25 (new):** `admin/websites/route.ts`'s `GET` (the admin "Websites" panel listing) sources its domain list from `tenant_domains` only, with no `tenants.domain` union — a tenant live only via the legacy column is invisible in that admin page, even though (post this round's fix) they're now correctly resolvable everywhere else. Whether the admin listing should synthesize a row for legacy-only tenants is a product/UX call (it's a *visibility* gap, not a resolution failure — nothing 400s or breaks), not something to fix blind in a file-only round.
- **#26 (new):** `src/lib/tenant-site.ts`'s `tenantSiteUrl()` (used to build "view in admin" links in `contact`/`lead`/`ingest/lead`/`portal/collect` notification emails and `team-provisioning.ts`'s team-member portal-login link) is the MIRROR gap — it reads `tenant.domain` (legacy column) only and never consults `tenant_domains` at all, falling back straight to the internal `<slug>.homeservicesbusinesscrm.com` carrying-subdomain when `tenant.domain` is null. That carrying subdomain is a real, live-routed host (middleware wildcard-matches it), so this is NOT a broken link — but for a tenant whose actual custom domain lives only in `tenant_domains` (e.g. added via the `admin/websites` panel in #25, which never touches `tenants.domain`), every notification/login link built this way points at the platform's internal subdomain instead of the tenant's own branded domain. Fixing it properly would mean making `tenantSiteUrl()` async and DB-aware (or threading a resolved domain through all 6 call sites) — a materially bigger, differently-shaped change than this round's single-fallback-branch fixes, so flagging for a scoped follow-up rather than changing a synchronous, purely in-memory helper's signature unilaterally.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
