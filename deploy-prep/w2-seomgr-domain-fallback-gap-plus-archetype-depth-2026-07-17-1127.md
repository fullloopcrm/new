# W2 gap/fluidity refresh — 2026-07-17 11:27

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). No master file (per W4's confirmed pattern) — continues directly from `w2-tenantdb-idor-sweep-clean-plus-cross-tenant-probe-2026-07-17-1117.md`.

Leader's fresh 3-deep queue this round (11:19 LEADER->W2): (1) continue project archetype depth, (2) continue fresh-ground hunting on a new candidate class, (3) keep gap/fluidity current.

## (1) Fresh-ground — new class: seomgr's domain->tenant resolvers skip the tenants.domain fallback

Last round's fresh-ground pivot (GET-by-`[id]` cross-tenant IDOR) leaned on `tenantDb()`'s auto tenant_id filter, which 5a-44 proved genuinely rejects a foreign tenant at the live-schema level. This round pivoted to the *other* direction of the same resolver contract this session's whole IDOR sweep depends on: **domain -> tenant_id** resolution, not id-scoped row filtering.

`src/lib/tenant.ts`'s `getTenantByDomain()` (the canonical resolver, reconciled with `tenant-lookup.ts` per the P1 spec) is explicit about its contract: query `tenant_domains` FIRST, fall back to `tenants.domain` only when no active `tenant_domains` row exists — never drop the legacy column, since `tenant_domains` registration is best-effort (`activate-tenant.ts`'s upsert is try/catch and "never blocks" activation). This session's earlier rounds already found and fixed two independent violations of that same contract in `src/lib/seo/health.ts` (fleet health checks) and `src/lib/seo/backlinks.ts` (`loadActiveFleet()`) — both now union `tenant_domains` with `tenants.domain`.

Swept the rest of `src/lib/seo/*` for the same shape (any query resolving a domain -> tenant, or a tenant -> domain, for registry/attribution purposes) and found **2 more live instances**, both un-fixed by the two prior rounds:

1. **`src/lib/seo/ingest.ts`'s `linkTenant(domain)`** — resolves a Google Search Console property's bare domain to a `tenant_id` for `seo_properties.tenant_id`, called from `upsertProperty()` on every `ingestAllProperties()` run (the SEO data-spine's Phase 1 registration step). Queried `tenant_domains` only.
2. **`src/lib/seo/onboarding.ts`'s `backfillUntrackedDomains()`** — registers every active `tenant_domains` host that isn't yet a tracked `seo_properties` row. Same tenant_domains-only query, no fallback.

**Consequence:** a tenant live only via legacy `tenants.domain` (pre-migration, or a failed/skipped `tenant_domains` upsert at activation) got every one of its GSC properties permanently ingested with `tenant_id: null` (class 1), *and* never got registered into `seo_properties` at all in the first place via the backfill path (class 2) — not "unlinked," genuinely untracked. `src/lib/selena/tools.ts`'s `handleSeoStatus(tid)` (Selena's "how's my SEO?" tool) filters `seo_properties` by `eq('tenant_id', tid)`, so the owner would ask and get "No Google Search Console property is linked to this business yet" despite metrics actually flowing for that domain under a null tenant_id row nobody could ever query back to them.

**Confirmed NOT this class (checked, ruled out):** `src/lib/seo/auto-verify.ts`'s `eligibleForAutoVerify()` also queries `tenant_domains` only, but it's marked `// tenant-scope-ok` — deliberate: it's an ALLOWLIST guardrail for a live-write auto-verify action (only touch domains that are *both* awaiting-grant *and* have an active `tenant_domains` row), not an attribution/registry lookup. Restricting to the tenant-confirmed source is the correct, safer behavior there, not a coverage gap.

**Fix:** both functions now fall back to `tenants.domain`, matching `tenant.ts`'s precedence exactly (tenant_domains wins where both exist — `linkTenant` returns on tenant_domains hit before querying tenants; `backfillUntrackedDomains` runs the tenant_domains pass first, then a second pass over legacy rows guarded by the same `tracked`/`seen` dedup sets so a domain covered by tenant_domains is never re-registered under a different tenant_id from a stale legacy row). 9 new vitest cases across 2 new files (`ingest.test.ts`, `onboarding.test.ts`), including a wrong-tenant probe in each (a domain present in `tenant_domains` for tenant A and, separately, in a *different* tenant B's stale `tenants.domain` — must resolve to A, never cross-attribute to B) and a null-case probe (a domain in neither source resolves to `null`, no default/wrong-tenant leak). Mutation-verified: reverted both fixes via `git diff` + `git apply -R` (git stash is disabled in this worktree), confirmed the fallback-regression tests go RED for the right reason (the legacy-only test returns `[]`/`null` instead of the tenant), restored and confirmed GREEN.

## (2) Archetype depth — 5a-45, proving the fallback against the live schema

Added **5a-45** to `platform/scripts/sim-all-trades.ts` (after 5a-44, before the `5b. CHANGE ORDER` section): deactivates the archetype tenant's own `tenant_domains` row(s) so resolution can only succeed via the fallback path, seeds a synthetic host onto `tenants.domain`, then calls the real (imported, not mocked) `linkTenant()` and confirms it resolves the correct live `tenant_id`. A second call with a host in neither source confirms `null`, not a leak. Restores both tables' original state (this tenant is shared by every later phase in the run).

This proves the one thing the 9 new vitest cases can't: `tenant_domains.domain` carries a real unique constraint at the DB level (`migrations/043_tenant_domains.sql`) while `tenants.domain` carries none (`supabase/schema.sql`) — a live-schema asymmetry a mocked `supabaseAdmin` can't reproduce, and exactly the asymmetry `getTenantByDomain()`'s own doc comments cite as the reason its TRANSITION divergence guard exists. Same convention as 5a-43/5a-44: **not run this round** — `sim-all-trades.ts` execution is blocked for worker execution by `~/.claude/hooks/block-worker-sim-scripts.sh` (leader-run-only, touches live prod Supabase).

**Leader: please run `SIM_ONLY=roofing npx tsx scripts/sim-all-trades.ts` (or a full run) to confirm 5a-45 (and the still-pending 5a-35 through 5a-44) pass before relying on them.**

## Verification this round

- `npx tsc --noEmit` clean (repo-wide, both fixed files + 2 new test files + `sim-all-trades.ts`).
- `npx eslint` on all touched/new files: 0 new warnings — the 3 `sim-all-trades.ts` warnings (`IndustryKey`, `COMMS_BY_KEY`, one `any` at line 2504) are pre-existing and nowhere near this round's insertion point; `onboarding.test.ts`'s 2 unused-param warnings (`_op`, `_val`) match the same underscore-prefixed-unused-param convention `backlinks.test.ts` already uses in its own chain-builder.
- Full suite: 578/578 files, 2496/2496 tests passing (37 pre-existing skipped), zero regressions.
- Both fixes mutation-verified (`git diff` the two files + `git apply -R` to revert — `git stash` is structurally disabled in this worktree, all 4 workers share one `.git` dir — confirmed the fallback-regression tests go RED for the right reason, restored, confirmed GREEN).
- File-only, no push/deploy/DB write. `sim-all-trades.ts` probe added but not run by me (leader-run-only, per standing convention).

## NOTICED — not fixed, flagging for the leader/Jeff

Carried forward unchanged from the prior round (items 1-23; #22 stays closed), plus:

- **#24 (new):** `backfillUntrackedDomains()` (`src/lib/seo/onboarding.ts`) has **zero callers anywhere in the codebase** — not wired to any cron, admin route, or script. Its own doc comment describes it as "register every active tenant_domains host that is not yet a tracked seo_property," implying a periodic safety-net role, but nothing currently invokes it; a tenant whose domain never got auto-registered at activation (`registerSeoProperty` inside `activate-tenant.ts` is the only other caller, fired once at activation time) has no second chance to be picked up. This round's fallback fix makes the function *more correct* once it runs, but doesn't make it run. Wiring a new cron entry point has real deploy/infra implications — flagging for Jeff's call, not doing it unilaterally in a file-only round.

## MISSING-FEATURE GAPS

Carried forward unchanged from the prior round's list, items 1-26 (gap #18 stays open on `reviews/request`, unchanged, still Jeff's product call).

## UX-FRICTION

Carried forward unchanged from the prior round's list.

File-only, no push/deploy/DB write from this worker.
