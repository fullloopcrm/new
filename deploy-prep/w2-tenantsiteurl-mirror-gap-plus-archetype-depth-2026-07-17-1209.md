# W2 gap/fluidity refresh — 2026-07-17 12:09

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-auto-verify-domain-fallback-gap-plus-archetype-depth-2026-07-17-1146.md`.

Leader's fresh 3-deep queue this round (11:56 LEADER->W2): (1) continue project archetype depth, (2) continue fresh-ground hunting, (3) keep gap/fluidity current.

## (1) Fresh-ground — closing NOTICED #26, the MIRROR of the resolver-precedence class

5a-45/5a-46/5a-47 all fixed the same shape: a resolver reading `tenant_domains` and never falling back to `tenants.domain`. An earlier round flagged the **mirror** of that bug as NOTICED #26 rather than fixing it blind, since it looked like a bigger, differently-shaped change than a single fallback branch: `tenantSiteUrl()` in `src/lib/tenant-site.ts` read `tenant.domain` (the legacy column) ONLY and never consulted `tenant_domains` at all, falling straight to the `<slug>.homeservicesbusinesscrm.com` carrying subdomain whenever `tenant.domain` was null.

That's not a broken link on its own — the carrying subdomain is real and live-routed (middleware wildcard-matches it) — but it's wrong for any tenant whose actual custom domain lives ONLY in `tenant_domains` (e.g. registered via the `admin/websites` panel, which writes `tenant_domains` only and never touches `tenants.domain` — this is exactly how a tenant could end up in this state). For that tenant, `tenantSiteUrl()` is used to build the "view in admin" links in the `contact`/`lead`/`ingest/lead`/`portal/collect` notification emails AND `team-provisioning.ts`'s team-member portal-login link (9 call sites, 6 distinct files) — every one of those pointed at the platform's internal subdomain instead of the tenant's own branded domain.

**Fix:** made `tenantSiteUrl()` async and, given a tenant `id`, resolve via a new `getPrimaryTenantDomain(tenantId)` helper (`src/lib/domains.ts`) — `tenant_domains`' PRIMARY active row first, falling back to `tenants.domain`, falling back to the slug subdomain — the same precedence direction as `getTenantByDomain()` (tenant_domains wins), just resolving the reverse way (tenant_id -> domain instead of domain -> tenant_id). This mirrors the inline pattern `api/referrers/[code]/route.ts` already used correctly for its own share-link resolution (confirmed while scoping this fix — that route was NOT buggy, it already unions both sources before ever falling back to `tenantSiteUrl({slug})`).

All 9 call sites updated to `await` the now-async function:
- `src/app/site/apply/layout.tsx`, `privacy-policy/page.tsx`, `terms-conditions/page.tsx`, `legal/page.tsx` (canonical/OG URLs)
- `src/app/api/contact/route.ts` (×2), `api/portal/collect/route.ts`, `api/ingest/lead/route.ts`, `api/lead/route.ts` (×2) (admin notification links)
- `src/lib/team-provisioning.ts` (team-member portal-login link)

11 new vitest cases across `tenant-site.test.ts` (6, incl. an is_primary-preference case and a wrong-tenant probe confirming a second tenant's `tenant_domains` row never leaks into this tenant's resolution) and `domains.test.ts` (5, incl. a wrong-tenant probe on `getPrimaryTenantDomain()` itself and a masked-error probe). Mutation-verified: reverted the `tenant-site.ts`/`domains.ts` diff via `git diff` + `git apply -R` (`git stash` disabled, shared `.git` dir across all 4 worker worktrees) — 6 tests went RED for the right reason (`getPrimaryTenantDomain is not a function` / wrong-URL assertions), reapplied, confirmed GREEN.

Verified every other `tenantSiteUrl` consumer's test file already fully mocks the `tenant-site` module (`vi.mock('@/lib/tenant-site', ...)` with a sync stub) rather than exercising the real implementation, so `await`-ing a sync mock's return value is a no-op change for those 6 route test files — confirmed by running them, zero failures.

## (2) Archetype depth — 5a-49, proving the reverse-lookup precedence against the live schema

Added **5a-49** to `platform/scripts/sim-all-trades.ts` (after 5a-48, before `5b. CHANGE ORDER`). `tenantSiteUrl()`/`getPrimaryTenantDomain()` are pure library functions (no `requireAdmin()` gate), so — like 5a-47's `eligibleForAutoVerify()` probe — this imports and calls the real function directly rather than mirroring its query inline. Two precedence cases (tenants.domain-only fallback; tenant_domains PRIMARY winning over a simultaneously-present legacy tenants.domain row) plus a wrong-tenant probe: creates a real second tenant with its own active PRIMARY `tenant_domains` row and confirms the first tenant's resolution never returns the second tenant's domain. Restores both tables' original state and deletes the throwaway second tenant (the run's primary tenant is shared by every later phase).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-49 (and the still-pending 5a-35 through 5a-48) pass before relying on them.**

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, all fixed/new files + `sim-all-trades.ts`).
- `npx eslint` on all touched/new files except `sim-all-trades.ts` (leader-run-only, hook-blocked even for lint): 0 new warnings — the 2 warnings surfaced (`privacy-policy/page.tsx`'s pre-existing unused `name` var at line 21, `tenant-site.ts`'s pre-existing `any` at `getTenantAreas` line 83) are both outside this round's diff.
- Full suite: 580/580 files, 2514/2514 non-skipped tests passing (37 pre-existing skipped), zero regressions.
- Fix mutation-verified (see above).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-25), plus:

- **#26: CLOSED this round.** See fix above.
- **#27 (new):** `src/lib/domains.ts`'s `TenantDomain` interface declares `type: 'primary' | 'neighborhood' | 'generic'`, `neighborhood`, and `zip_codes` fields, and `attribution.ts`'s entire address-based lead-attribution feature (`attributeByAddress()`, called from `portal/collect` and booking auto-attribution) depends on querying `tenant_domains` by `neighborhood`/`zip_codes`/`type='generic'`. Swept every `tenant_domains`-touching migration in `src/lib/migrations/` (`043_tenant_domains.sql` — the CREATE TABLE — plus `046_rls_deny_on_new_tables.sql` and `058_fix_nycmaid_routing.sql`, the only other two that reference the table) and found NO migration that adds `type`, `neighborhood`, or `zip_codes` columns — 043's CREATE TABLE only has `id, tenant_id, domain, active, is_primary, notes, created_at`, plus `routing_mode`/`vercel_project`/`status` per W1's P1 migration (per `tenant-lookup.ts`'s own comments). This could be the same kind of schema.sql-vs-live drift already caught once this session (NOTICED #19, `worker_token` vs `team_member_token`) — i.e. the columns may exist live via an out-of-band migration never checked in — or it could mean the entire address-attribution feature has been silently non-functional (empty domain sets, `attributeByAddress()` returns `null` immediately) for every tenant, unrelated to the `tenant_domains`/`tenants.domain` resolver-precedence bug class this session has been fixing. Did NOT chase this further — confirming which is true requires a live-schema check I can't run myself (leader-run-only, same constraint as `sim-all-trades.ts`), and it's a differently-shaped question (schema drift, not resolver precedence) than this round's fix. Flagging for the leader to check `information_schema.columns` on `tenant_domains` directly.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
