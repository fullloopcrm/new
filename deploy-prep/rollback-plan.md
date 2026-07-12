# Part 0 Release — Rollback Plan

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-11 · **Status:** FILE ONLY — nothing here was run. The leader executes against prod after Jeff approves.

Standing safety: W1 ran no DB command and no deploy to author this. Every command below is for the **leader** to run, in the paths shown.

---

## ⚠️ Numbering note — read first

The LEADER order named migrations **058/059/060/061/062**. Those numbers do **not** match the repo. On disk the Part-0 **schema lane** (`platform/src/lib/migrations/`) is:

| Release step | Actual file | What it does |
|---|---|---|
| add columns | `055_tenant_domains_routing.sql` | adds `routing_mode`, `vercel_project`, `status`, `updated_at` (+ trigger) to `tenant_domains`, NULLABLE-first |
| backfill | `055_tenant_domains_routing.backfill.sql` | seeds coverage rows + fills the 3 new cols from source of truth |
| enforce | `056_tenant_domains_routing_enforce.sql` | `SET DEFAULT` + `NOT NULL` on `routing_mode`/`status` |
| freeze | `057_freeze_tenants_domain.sql` | write-freeze trigger on legacy `tenants.domain` |
| vercel backfill | `059_backfill_vercel_project.sql` | real (partial) `vercel_project` backfill; unknowns → NULL |
| secdef lockdown | `060_lockdown_secdef_rpcs.sql` | REVOKE `authenticated` on 2 SECURITY DEFINER RPCs |

**There is no `058`, `061`, or `062`.** This plan covers the files that actually exist. If the leader expected a different set, resolve the numbering before applying.

`created_at` on `tenant_domains` pre-exists (migration `043_tenant_domains.sql:15`). `055` only *guarded-adds* it, so **no rollback step drops `created_at`.**

Rollback order = **reverse of apply order**: (d) security bundle → (c) backfills → (b) migrations `060 → 059 → 057 → 056 → 055-backfill → 055` → (a) resolver flip. Roll back only the component that broke unless a lower layer is implicated.

---

## (a) Resolver flip (W2 lane) → revert resolver + `057_unfreeze` + tenant_domains-first off

**What shipped:** W2's change making the tenant resolver read `tenant_domains` FIRST (host → tenant_id), with `tenants.domain` as fallback (per `P1-SCHEMA-SPEC.md`). Today's code still reads `tenants.domain` first and *falls back* to `tenant_domains` (`platform/src/lib/tenant-lookup.ts:116`); the flip inverts that.

**Rollback (two parts):**

1. Revert the resolver-flip commit so lookups go back to `tenants.domain`-first:
   ```bash
   git -C platform revert --no-edit <RESOLVER_FLIP_SHA>   # then leader redeploys
   ```
   ("drop tenant_domains-first" = restore `tenants.domain`-first ordering in the resolver — **not** dropping the `tenant_domains` table.)
2. Lift the legacy-column write-freeze so `tenants.domain` is writable again (the freeze assumed `tenant_domains` was authoritative):
   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f platform/src/lib/migrations/057_unfreeze_tenants_domain.sql
   ```

**Trigger signal:** tenant sites resolve to the WRONG tenant, or a domain 404s / serves the template when it should be bespoke, after the flip deploys. (Fast check: hit 2–3 known bespoke hosts and confirm the served site.)

---

## (b) Migrations → exact reverse SQL

Run each block with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1`. Apply in the order listed (already reverse-of-release).

### 060_lockdown_secdef_rpcs.sql — revert to 039's grants
Restores `authenticated` EXECUTE and clears the pinned `search_path`.
```sql
GRANT EXECUTE ON FUNCTION post_journal_entry(UUID,UUID,DATE,TEXT,TEXT,UUID,UUID,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT)                                   TO authenticated;
ALTER FUNCTION post_journal_entry(UUID,UUID,DATE,TEXT,TEXT,UUID,UUID,JSONB) RESET search_path;
ALTER FUNCTION cpa_token_bump_usage(TEXT)                                   RESET search_path;
```
> ⚠️ Reverting 060 **re-opens** the cross-tenant ledger-forgery hole it closed. Only revert if 060 itself breaks a legitimate `service_role` call — which it should not (service_role keeps EXECUTE). Prefer leaving 060 in place.
> **Trigger signal:** legitimate server-side `post_journal_entry` / `cpa_token_bump_usage` calls start failing with `permission denied for function`.

### 059_backfill_vercel_project.sql — restore the pre-059 (055-blanket) value
059 is data-only: it set determinable rows to the FL project id and reset unknown-bespoke rows to NULL. Pre-059 state (from the 055 blanket) was `'fullloopcrm'` on every row. This restores that, touching only 059's own auto-values (never a human override):
```sql
UPDATE tenant_domains
   SET vercel_project = 'fullloopcrm'
 WHERE vercel_project = 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'
    OR vercel_project IS NULL;
```
> `vercel_project` is deploy metadata the resolver never reads, so a 059 revert is low-risk and rarely needed.
> **Trigger signal:** an onboarding/deploy tool that reads `vercel_project` chokes on the NULLs 059 introduced.

### 057_freeze_tenants_domain.sql — reverse file already exists
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f platform/src/lib/migrations/057_unfreeze_tenants_domain.sql
```
(Drops `trg_freeze_tenants_domain` + `freeze_tenants_domain()`. Same command as step (a).2.)
> **Trigger signal:** a legitimate `tenants.domain` INSERT/UPDATE is blocked with `tenants.domain is write-frozen …` and you need the legacy write path back.

### 056_tenant_domains_routing_enforce.sql — drop NOT NULL + defaults
```sql
ALTER TABLE tenant_domains ALTER COLUMN routing_mode DROP NOT NULL;
ALTER TABLE tenant_domains ALTER COLUMN status       DROP NOT NULL;
ALTER TABLE tenant_domains ALTER COLUMN routing_mode DROP DEFAULT;
ALTER TABLE tenant_domains ALTER COLUMN status       DROP DEFAULT;
```
> **Trigger signal:** a NULL `routing_mode`/`status` write path is needed, or the `NOT NULL` enforce is rejecting a legitimate insert.

### 055_tenant_domains_routing.backfill.sql — reverse the data fill
Only meaningful **after 056 is reverted** (can't NULL a NOT NULL column). Removes the coverage-seed rows and nulls the three backfilled columns:
```sql
DELETE FROM tenant_domains
 WHERE notes = 'Seeded from tenants.domain by 055 backfill (coverage for verification)';
UPDATE tenant_domains SET routing_mode = NULL, status = NULL, vercel_project = NULL;
```
> If you are doing a **full 055 rollback** (drop the columns, below), skip this — the data leaves with the columns.
> **Trigger signal:** the backfill mis-mapped `routing_mode`/`status` for many rows and you want a clean re-fill.

### 055_tenant_domains_routing.sql — drop the added columns
Full teardown of the schema addition. Reverse order of creation; `created_at` is **kept** (pre-existed in 043).
```sql
DROP TRIGGER  IF EXISTS trg_tenant_domains_updated_at ON tenant_domains;
DROP FUNCTION IF EXISTS tenant_domains_updated_at();
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS tenant_domains_routing_mode_check;
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS tenant_domains_status_check;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS routing_mode;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS vercel_project;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS status;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS updated_at;
-- NOTE: created_at is intentionally NOT dropped (pre-existed in 043_tenant_domains.sql).
```
> ⚠️ Destructive: drops the backfilled routing data. Requires the resolver to be back on `tenants.domain`-first (step (a)) **first**, or host resolution breaks.
> **Trigger signal:** the whole `tenant_domains` routing model is being abandoned for this release.

---

## (c) Backfills (`owner_phone`, `pricing_model`) → revert to NULL/prior

Both backfills are **one-shot data UPDATEs with no captured pre-image**. A precise revert is impossible unless the leader snapshots first. **Mandatory precondition — run these snapshot statements immediately before applying each backfill:**

```sql
-- BEFORE 2026_07_11_owner_phone_backfill.sql:
CREATE TABLE IF NOT EXISTS _rollback_owner_phone_20260711 AS
  SELECT id, owner_phone FROM tenants;

-- BEFORE 2026_07_11_pricing_model_backfill.sql:
CREATE TABLE IF NOT EXISTS _rollback_pricing_model_20260711 AS
  SELECT id, pricing_model, per_unit FROM service_types;
```

### owner_phone backfill — restore
```sql
UPDATE tenants t
   SET owner_phone = s.owner_phone
  FROM _rollback_owner_phone_20260711 s
 WHERE s.id = t.id
   AND t.owner_phone IS DISTINCT FROM s.owner_phone;
```
**Fallback if no snapshot exists:** the backfill only wrote rows that were NULL/blank and never touched nycmaid, but it drew from multiple sources, so you cannot identify exactly which rows it set. Best available blunt revert is to re-null everything except nycmaid — **destructive to any legitimately pre-existing `owner_phone`**, so treat as last resort:
```sql
-- LAST RESORT, no snapshot: re-null all except the well-known nycmaid tenant.
UPDATE tenants SET owner_phone = NULL
 WHERE id <> '00000000-0000-0000-0000-000000000001'::uuid
   AND slug IS DISTINCT FROM 'nycmaid';
```
> **Trigger signal:** the per-tenant owner check (commit 017043fa, `agent.ts isOwnerOfTenant`) locks real owners **out** because the backfill wrote a wrong number, OR grants owner access to a wrong phone (privilege escalation — revert immediately).

### pricing_model backfill — restore
```sql
UPDATE service_types st
   SET pricing_model = s.pricing_model,
       per_unit      = s.per_unit
  FROM _rollback_pricing_model_20260711 s
 WHERE s.id = st.id
   AND (st.pricing_model IS DISTINCT FROM s.pricing_model
        OR st.per_unit   IS DISTINCT FROM s.per_unit);
```
**Fallback if no snapshot exists:** the backfill only ever moved rows OFF `'hourly'` (→ `'flat'`, some also `per_unit → 'job'`). A blunt inverse re-hourlies everything it could have touched — **destructive to genuinely-flat services configured before the backfill**, last resort only:
```sql
-- LAST RESORT, no snapshot: re-hourly non-product services (over-broad).
UPDATE service_types
   SET pricing_model = 'hourly'
 WHERE pricing_model = 'flat'
   AND item_type IS DISTINCT FROM 'product'
   AND tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid;
```
> **Trigger signal:** team-portal checkout (`src/app/api/team-portal/checkout/route.ts`) bills the wrong amount for a tenant after the backfill — e.g. a genuinely hourly tenant got flipped to flat, or vice-versa.

---

## (d) Security-bundle deploy → revert commit + redeploy prior

**Bundle contents (this release):**
- `282bee77` — stop echoing `x-tenant-sig` on the response header (`platform/src/middleware.ts`)
- `ab2f6e5e` — `tenant_isolation` RLS across ~135 tenant-scoped tables (migration `2026_07_11_rls_tenant_tables.sql`) — **DDL, applied separately by the leader; not carried by the Vercel deploy**
- (context, same security sweep: `038428f8`, `fabd246f`, `dcef807b`)

### Code rollback (Vercel deploy)
```bash
git -C platform revert --no-edit 282bee77   # + any other bundled code SHA to undo
# then leader redeploys prior, e.g.:  vercel --prod   (leader account, not W1)
```
Or promote the previous known-good production deployment in the Vercel dashboard (faster than a rebuild).
> **Trigger signal:** portal/team-portal auth or tenant-scoped requests start failing after the deploy, or the `x-tenant-sig` change breaks a downstream header consumer.

### RLS migration rollback (DB) — per the migration's own header
```sql
-- For each affected table t (list in 2026_07_11_rls_tenant_tables.sql):
DROP POLICY IF EXISTS tenant_isolation ON public.<t>;
ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;   -- optional; only if RLS was off before
```
> The platform runs every query through `service_role` (which **bypasses** RLS), so this migration is defense-in-depth and should be behavior-neutral. If a tenant site regresses right after apply, the RLS DDL is the **least likely** cause — check the code deploy first.
> **Trigger signal:** a route using an anon/authenticated Supabase client (not service_role) starts returning empty/denied results for legitimate cross-tenant-free reads after RLS is enabled.

---

## Quick reference — command + signal per component

| # | Component | One-line rollback | Trigger to roll back |
|---|---|---|---|
| a | Resolver flip | revert resolver SHA + run `057_unfreeze` | hosts resolve to wrong/oh-404 tenant |
| b | `060` secdef | GRANT `authenticated` back + RESET search_path | legit service_role RPC gets `permission denied` |
| b | `059` vercel | `UPDATE … SET vercel_project='fullloopcrm' WHERE …` | tool reading `vercel_project` chokes on NULLs |
| b | `057` freeze | run `057_unfreeze_tenants_domain.sql` | legit `tenants.domain` write blocked |
| b | `056` enforce | `ALTER … DROP NOT NULL / DROP DEFAULT` | NULL write path needed |
| b | `055` backfill | `DELETE` seed rows + `UPDATE … SET … NULL` | routing_mode/status mis-mapped |
| b | `055` add | `DROP` cols (keep `created_at`) | abandoning tenant_domains routing |
| c | owner_phone | restore from `_rollback_owner_phone_20260711` | owner lockout / wrong-owner grant |
| c | pricing_model | restore from `_rollback_pricing_model_20260711` | checkout bills wrong amount |
| d | security code | `git revert 282bee77` + redeploy prior | auth/tenant requests fail post-deploy |
| d | RLS DDL | `DROP POLICY tenant_isolation` (+ DISABLE RLS) | anon/authenticated route denied post-apply |
