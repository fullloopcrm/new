# W2 gap/fluidity refresh — 2026-07-18 06:19

Per Jeff's 3-track rule (bugs / missing-feature gaps / UX-friction). Continues from `w2-16-cron-status-gate-gap-2026-07-18-0602.md`.

Leader's instruction this round (06:03 LEADER->W2): fresh 3-deep queue — (1) new fresh-ground surface: the seo-* pipeline (11 crons, lib-layer not route-layer) per this worker's own flag from the prior round. (2) continue whichever surface (1) opens up. (3) keep gap/fluidity current.

## (1) — new fresh-ground surface: the seo-* lib layer was never gated on tenant status at all

Opened the investigation the prior round flagged but didn't attempt: 11 `seo-*` cron routes are thin wrappers delegating to `lib/seo/*.ts` (e.g. `checkCriticalSeoAlerts()`, `runAutopilot()`), so the tenant-fetch loop this session has been fixing at the route layer for 30+ other crons doesn't exist there — it's one level deeper, inside each lib function's own property/issue enumeration.

Read all 11 lib files end to end. Confirmed: **none of them checked tenant status anywhere.** A suspended/cancelled/deleted tenant's `seo_properties`/`seo_issues`/`seo_changes` rows keep flowing through every stage of the pipeline exactly as if the tenant were still live, indefinitely — GSC quota, paid SERP calls, paid Anthropic drafting spend, and (worst) live site writes, all continuing for a tenant that no longer exists on the platform.

**Highest severity — real live-site writes, not just spend:**
- `autopilot.ts`'s `runAutopilot()` reads `seo_changes` (status='proposed', tier=1) and calls `applyOverride()`, which writes directly to `seo_overrides` — the table `generateMetadata` reads to render a tenant's LIVE page title/meta. Zero tenant-status check meant a suspended/cancelled/deleted tenant's site kept getting its live SEO copy silently rewritten by autopilot forever, same severity class as this session's other real-write findings (`finance-post`, `lifecycle`, `generate-recurring`).

**Real paid-API spend, drafts-only (human-reviewed before anything ships) but never free:**
- `technical.ts` (`runTechnicalScan`) — burns Google's metered URL Inspection quota (~2k/day/property) per property.
- `competitors.ts` (`runCompetitorScan`) — burns paid Serper.dev SERP calls (~$0.0003/query) per property.
- `remediate.ts` (`generateProposals`), `competitor-remediate.ts` (`generateCompetitorProposals`), `enrich.ts` (`generateEnrichments`) — each calls the Anthropic API per open issue.
- `backlinks.ts`'s `loadActiveFleet()` — misleadingly named (this worker's own function from an earlier round in this session): "active" meant only "has a resolvable domain," never tenant status. Drafted citation/editorial proposals into `seo_backlink_opportunities` for every fleet tenant regardless of status; if a human approved one, that's a real third-party directory submission for a business that no longer exists on the platform.
- `ingest.ts`'s `ingestAllProperties()` — pulls GSC Search Analytics (quota-metered) per property every run.

**Fix shape:** new shared helper `src/lib/seo/tenant-gate.ts` — `nonServingTenantIds()`, a thin wrapper around `tenant-status.ts`'s `tenantServesSite()` pre-resolved into a `Set<tenant_id>` (mirrors this session's established per-cron fetch-all-then-filter-in-memory shape, adapted for a property/issue array instead of a tenant array). Applied at the earliest practical filter point in each file:
- `autopilot.ts` — filter `changes` before bundling, so no bundle for a non-serving tenant ever reaches `applyOverride()`.
- `technical.ts`, `competitors.ts` — filter the `seo_properties` result before the property loop, so no inspection/SERP call happens.
- `remediate.ts`, `competitor-remediate.ts`, `enrich.ts` — filter the `seo_issues` result before the proposal loop, so no Anthropic call happens.
- `backlinks.ts`'s `loadActiveFleet()` — added `status` to the `tenants` select and filter with `tenantServesSite()` directly (matches this function's own resolver-precedence pattern from an earlier round).
- `ingest.ts`'s `ingestAllProperties()` — property registration (`upsertProperty`/`seo_properties` upsert) still happens either way (cheap, keeps the row trackable for reactivation); only the GSC Search Analytics pull (`ingestProperty`, the actual metered cost) is skipped for a non-serving tenant.

A `tenant_id: null` row (FL-owned property or not-yet-linked domain) is never excluded — only a resolved tenant whose status matches `NON_SERVING_STATUSES` is. Verified with an explicit test case in every new/touched test file.

**Checked, deliberately NOT fixed this round (flagged for Jeff's call, same as item 49's `backup` judgment call):**
- `detect.ts`'s `detectAllProperties()` — the classification logic lives entirely in a Postgres RPC (`seo_run_detection`, reading the materialized `seo_page_rollup`), not the app layer. Gating this needs a migration to the SQL function or the rollup itself, not a file-only change — carried forward as its own surface requiring DB work the leader would run after approval, not something to rush into a migration file sight-unseen against a function this worker hasn't read the SQL body of.
- `verify-revert.ts`'s `runVerifyRevert()` — only ever touches changes autopilot already applied (title/meta rollback). Judged as cleanup/corrective, not proactive spend or new harm, regardless of the tenant's current status — reverting a dead tenant's already-applied override is arguably still correct behavior, not a gap.
- `alerts.ts`'s `checkCriticalSeoAlerts()` — pages Jeff about `site_down`/`index_cliff` issues regardless of tenant status. Genuinely ambiguous whether Jeff wants to keep hearing about a cancelled tenant's site going dark (could matter for a dispute/reactivation window, could be pure noise) — needs his call, not a unilateral fix, same shape as the `backup` retention question.
- `health.ts`'s `checkFleetHealth()` — pings every tenant_domains/tenants.domain host with no status filter by design (own comment: "union both sources... coverage can never silently drop a tenant's real domain"). This is a free HTTP check, not paid spend or a write to the tenant — left as-is; flagging only in case Jeff wants dead tenants excluded from the health dashboard for signal-to-noise reasons.

## (2) — surface (1) fully investigated; no further layer beneath it

All 11 `seo-*` crons' lib dependencies were traced: 5 files (`ingest.ts`, `backlinks.ts`, `health.ts`, `onboarding.ts`, `auto-verify.ts`) do their own domain→tenant resolution (all already correct — tenant_domains-first/tenants.domain-fallback precedence fixed in earlier rounds this session); the other 9 consume `seo_properties.tenant_id`/`seo_issues.tenant_id` set once by those 5, with no independent resolver logic to re-check. Nothing further to open under this surface.

## (3) — gap/fluidity kept current

Carried-forward NOTICED items 1–29, 31–32, 34–35, unchanged (see prior rounds' docs).

Carried forward, still flagged not fixed (product/rollout/data calls, unchanged):
- `webhooks/stripe` never calling `activateTenant()` (HIGH SEVERITY, flagged 2026-07-18 ~02:10, in `JEFF-MORNING-QUEUE.md`).
- Item 30: ComHub `requireAdmin()` vs. nav-parity.
- Item 33: three bespoke-site tenants' dead, cross-tenant-contaminated `_lib/domains.ts` + `_lib/lead-filters.ts`.
- Item 38: owner/admin Telegram bots hardcoded off nycmaid / not tenant-scoped.
- Item 49: `backup`'s use of `tenantServesSite()` may be too strict for data-retention purposes — needs Jeff's call.

NEW this round:

53. The seo-* lib layer (item 52's carry-forward) was never gated on tenant status anywhere — fixed in 7 of 11 files (`autopilot`, `technical`, `competitors`, `remediate`, `competitor-remediate`, `enrich`, `backlinks`) plus `ingest`'s metrics-pull step; `autopilot.ts` was writing live site overrides for dead tenants, the rest were burning paid GSC/SERP/Anthropic spend on them. `detect.ts` (DB-side RPC, needs a migration), `verify-revert.ts`, `alerts.ts`, and `health.ts` checked and judged not-this-gap or needing Jeff's call — see (1) above.

## MISSING-FEATURE GAPS / UX-FRICTION

Carried forward, unchanged: items 18–20.

## Verification this round

- `npx tsc --noEmit`: clean.
- `npx vitest run src/lib/seo/`: 13 test files, 91/91 pass — includes 7 new test files (`tenant-gate`, `autopilot`, `technical`, `competitors`, `remediate`, `competitor-remediate`, `enrich`, `ingest.status-gate` — 8 actually) covering the new status-gate filter with an explicit wrong-tenant probe in each, plus new cases added to the existing `backlinks.test.ts`, and the 5 pre-existing seo test files (`alerts`, `auto-verify`, `ingest`, `onboarding`, and `backlinks`'s original suite) all still pass unmodified.
- Full repo suite: not run this round (large; prior rounds ran it in background) — every touched file's own test suite passes and the change shape (fetch-all, filter-in-memory before the loop) is the same pattern verified safe every round this session.

File-only, no push/deploy/DB write from this worker. 1 new lib file (`tenant-gate.ts`) + 8 lib fixes + 8 new test files + additions to 1 existing test file + 1 docs commit.
