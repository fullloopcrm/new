# Branch changelog — `p1-w5`

_Author: worker W5. Generated 2026-07-12 from `git log $(git merge-base main p1-w5)..p1-w5`
(85 commits, merge-base `669f588f`). File-only summary — no code changed to produce this
doc. Ordered oldest → newest; grouped by theme, not strict chronology, for readability._

## 0. Headline number: tenantClient conversion status

**35 of an estimated ~298 tenant-scoped API read-paths have a proof-of-conversion test.
0 of those 298 have actually been cut over in live code.**

- **Converted (proof authored):** 35 test files under
  `platform/src/lib/tenant-client-proof/` (35 distinct GET routes + 3 shared-lib helper
  DRY probes = 38 distinct read-paths examined; some routes share a file in the two
  "batch" proofs, one route — `crews` — has two proof variants). All are **unwired**:
  the example files are standalone copies of the read logic, not imports into the live
  route files. Zero files under `platform/src/app/api/**` were edited by this work.
- **Total candidate population:** ≈298, per
  `deploy-prep/service-role-to-scoped-client-map.md:59` (the "tenant-scoped API
  (rest)" bucket — the ≈437 total `service_role`/`supabaseAdmin` call sites in
  `platform/src`, minus the cron/admin/webhook carve-outs that correctly KEEP
  `supabaseAdmin` forever). This denominator is an arithmetic estimate, not a route-by-
  route enumeration — see that doc's own caveat at line 130.
- **Verified counts (this session):** `find platform/src/lib/tenant-client-proof
  -name '*.example.ts'` → 35. `find ... -name '*.test.ts'` → 35.
  `npx vitest run src/lib/tenant-client-proof src/lib/tenant-client.test.ts` → **36 test
  files / 152 tests, all pass** (36 = the 35 proof files + the core
  `tenant-client.test.ts` factory suite). `npx tsc --noEmit` → 0 errors.
- **Of the 35 proof-of-conversion routes, a majority are flagged HOLD, not
  cutover-ready**, because the read embeds or directly targets a table absent from
  `rls-tier-rollout-order.md` (grep = 0 hits ⇒ no tier slot yet). Recurring blockers
  found across the set:
  - `team_members` — untiered, load-bearing in **6** of the 35 proofs (`cleaners`,
    `bookings/closeout`, `schedules` list, `crews`, `routes`/dispatch,
    `schedules/[id]` detail).
  - `service_types` — untiered, load-bearing in the `getSettings` shared-helper probe
    and the `catalog` route (~22 call sites total, per the `getSettings` DRY probe).
  - `crew_members` (join table), `job_payments`, `website_visits`, `connect_messages` /
    `connect_read_cursors` — each untiered, each blocking one further route
    (`crews`, `jobs`, `leads/attribution`/`leads/domains`/`sidebar-counts`,
    `connect/unread`/`sidebar-counts` respectively).
  - Net effect: fixing the `team_members` tier gap alone unblocks 6 of the 35 proofs;
    it is the single highest-leverage tier slot still missing.
- Two proofs (`getSettings`, `comms-prefs`) are **DRY boundary probes**, not
  route conversions: they prove a *shared lib helper* is either a mixed KEEP-SCOPE
  split (`getSettings`: `service_types` half convertible, `tenants` half must stay on
  `supabaseAdmin` forever) or a pure NEVER-CONVERT case (`comms-prefs`: 100%
  registry-by-`id` reads against `tenants`, which has no `tenant_id` column and is
  untiered by design). `listEntities` (the `entities` probe) is the one shared-helper
  case that DRY-converts cleanly in one line.
- **Naming note:** this branch also carries a pre-existing, unrelated wrapper,
  `tenantDb()` in `platform/src/lib/tenant-db.ts` (app-layer auto-`.eq('tenant_id',…)`
  filter over `supabaseAdmin` — no RLS/JWT involved, predates this branch, commit
  `3e27430d` on `main`). It is effectively **unadopted**: grep for `tenantDb(` under
  `platform/src/app` returns one hit, and that hit is a string literal in an admin
  dashboard page, not a call site. If "tenantDb" in leader instructions meant that
  wrapper specifically rather than the `tenantClient()`/RLS-JWT effort this branch
  built: **0 of ~298 routes use it.** Flagging the ambiguity rather than guessing.

## 1. `tenantClient()` + RLS enablement path (the bulk of this branch, ~50 commits)

Design → factory → proof-of-conversion, in order:

- `c56579dc` — design spec: `tenantClient(tenantId)` factory (HS256 JWT,
  `role: authenticated` + `tenant_id` claim) and the `SUPABASE_JWT_SECRET` wiring it
  needs. Spec only.
- `767416cb` — `tenantClient()` factory implemented + unit test (unwired). Two
  deliberate divergences from spec, documented in the module header: Node `crypto`
  instead of `jose` (no new dependency allowed), sync instead of async.
- `cf6eeacc`, `4d1bede1`, and 28 further single/triple-route commits
  (`e4ab7495` … `bbb22a9d`) — the 35 proof-of-conversion tests enumerated in §0.
- `039a799e`, `bdf25af6` — core factory security/edge-case hardening tests: cross-tenant
  rejection, null/absent tenant, JWT claim-injection resistance, `persistSession`/
  `autoRefresh` disabled, base64url encoding, integer-second `iat`/`exp`.
- `a89d73fa` — `SUPABASE_JWT_SECRET` wiring runbook (ordered, gated verifies).
- `577da269` — `rls-cutover-master-plan.md`: single ordered path
  A(adopt tenant-client) → B(wire JWT + smoke test) → C(enable RLS tiers 1–5, inert) →
  D(per-table convert + keep-scope + prove cross-tenant-empty).

Supporting RLS-enablement prep (precondition work the cutover plan depends on):

- `37954571` — RLS coverage audit: 132 `tenant_id` tables mapped, 58 no-RLS gaps found.
- `d575be2c` — RLS gap-closure SQL prepared (58 tables) — **file only, not executed.**
- `0ecf5733` — NULL-tenant-id backfill prepared (ADR 0005 precondition) — **not executed.**
- `6066e5cb` — RLS enablement rollout plan (ordered, consolidates audit + backfill +
  gap-closure).
- `e730b7ce` — RLS tier rollout order: numbered 1–58 enable order across 5 risk tiers.
- `3e59b65d` — RLS post-enablement verify SQL (policy-name-agnostic).
- `695b2a81` — RLS enablement dry-run checklist with explicit PASS/FAIL gates.
- `b91a3041` — PART 0 execution master checklist, consolidating every file-only prep
  artifact with per-line sign-off gates.
- `14e6e1fc` — `service-role-to-scoped-client-map.md`: 623 `service_role` call sites
  bucketed CONVERT vs KEEP; source of the ≈298 denominator used in §0.

## 2. Compliance / security artifacts (docs only, no code)

- `1bbdaac9` — SECURITY DEFINER RPC review (2 in-repo fns vs 26 in prod — gap flagged).
- `7eee7204` — credential rotation policy (T0/T1/T2 cadence + procedure).
- `50992869` — P9 audit-logging expansion design (`tenant_write_events`) + best-effort
  `logTenantWrite` lib — **prepared, not wired.**
- `567550d2` — P10 security policy compliance doc.
- `04a756c1` — audit-log coverage matrix: 338 tenant-write routes mapped; **0/338
  currently wired** to the P9 taxonomy.
- `fbb9066c` — compliance data map: per-table PII inventory, data-subject keys, FK
  erasure behavior (flags that `bookings`/`invoices`/`sms_conversations` are
  `SET NULL`/plain-ref from `clients`, **not cascade** — a blind `DELETE clients` errors).
- `3ad6cab0` — tenant data retention map: documents actual state (only
  `cron/cleanup-videos` deletes anything, 30-day job videos) vs proposed
  statutory-keep/anonymize/delete windows.
- `a9a5fc6c` — schema drift register: `clients.active`/`sms_consent` canonical vs
  `clients.status`/`sms_opt_in` phantom — feeds the bug fix in §3.
- `9fb56b9a` — schema-drift regression guard test (no-new-references on the dead
  `sms_opt_in` column).

## 3. Bug fix landed on this branch

- `a199a770` / `53d3d343` — **TCPA opt-out bug, fixed.** `send-apology-batch` was
  gating sends on the dead `clients.sms_opt_in` column while opt-outs write the real
  `clients.sms_consent` column, so opted-out clients kept receiving texts. Fixed to
  read the canonical column; spec doc + RED→GREEN test included.

## 4. Pre-existing branch history (not authored by this worker's queue, carried by
   the shared `p1-w5` worktree)

These commits predate the deploy-prep/tenant-client queue and were already on the
branch when this worker's tasks began; listed for completeness since this is a
full-branch changelog:

- Consortium NYC rebrand/SEO sweep (9 commits, `c828477b` … `b124e0c9`): retarget
  copy from "marketing company" to "web design company" across home/body/template
  copy, sitemaps, canonical FAQ.
- Security fix batch (`62623a8d` + 4 merged branches): 3× XSS (AI dashboard reflected
  content, tenant theme colors in `<style>`, template JSON-LD), PIN brute-force
  throttle + 6-digit widen, double cleaner-payout race fix (claim-before-transfer).
- `0154f307` — P0: Clerk removed entirely, owner auth moved to session system.
- `8b6757be`, `a95736f0`, `db98e96b` — P3 crypto/trust-boundary tests: session +
  client-auth crypto, domain resolver swap-incident guard, tenant-header signature.
- `83cf61de` — tenant mail now sent from tenant identity, not bare "Full Loop" (fixes
  "domain not verified" bounces).

## What is NOT in this branch

- No live API route (`platform/src/app/api/**`) has been edited to use `tenantClient()`
  or `tenantDb()`. All conversion work is proof-only, in a separate `-proof` directory.
- No RLS policy has been enabled against a real database. All SQL in `deploy-prep/` is
  prepared, not executed — DDL runs are explicitly reserved for the leader after Jeff's
  approval, per standing rules.
- `SUPABASE_JWT_SECRET` is not set in any environment covered by this repo; every
  `tenantClient()` call fails closed until it is.
- No `git push`, deploy, or prod DB write occurred from this worktree.
