# Part 0 Release — Per-Migration Rollback Notes

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — nothing here was run. W1 executed no DB command and no deploy to author this. Every statement below is for the **leader** to run against prod after Jeff approves.

Companion to [`rollback-plan.md`](./rollback-plan.md). That file is the *release-level* rollback (resolver flip, security bundle, quick-reference table). **This** file is a *per-migration* reversal note: one section per file the leader applies, in the range the LEADER order named (`055`–`062`) plus the two data backfills, each with its own exact reverse SQL, idempotency note, and trigger-to-roll-back.

---

## ⚠️ Read first — numbering, and a staleness flag on the companion file

The LEADER order names migrations **055–062**. On disk (`platform/src/lib/migrations/`) the files that actually exist are:

| Order # | File(s) on disk | Kind | Reverse artifact |
|---|---|---|---|
| 055 | `055_tenant_domains_routing.sql` | DDL: add 4 cols nullable + trigger | §055-add below |
| 055 | `055_tenant_domains_routing.backfill.sql` | DATA: seed + fill 3 cols | §055-backfill below |
| 055 | `055_tenant_domains_routing.verify.sql` | READ-ONLY (RAISE-only gate) | none — nothing to reverse |
| 056 | `056_tenant_domains_routing_enforce.sql` | DDL: `NOT NULL` + `DEFAULT` | §056 below |
| 057 | `057_freeze_tenants_domain.sql` | DDL: write-freeze trigger | `057_unfreeze_tenants_domain.sql` (ships as the reverse) |
| 058 | **does not exist** | — | — |
| 059 | `059_backfill_vercel_project.sql` | DATA: real `vercel_project` fill | §059 below |
| 060 | `060_lockdown_secdef_rpcs.sql` | DDL: REVOKE + pin search_path | §060 below |
| 061 | `061_nycmaid_routing_reconcile.sql` | DATA: flagship routing reconcile | §061 below |
| 061 | `061_nycmaid_routing_reconcile.verify.sql` | READ-ONLY (RAISE-only gate) | none — nothing to reverse |
| 062 | **does not exist** | — | — |

**Staleness flag for the leader:** `rollback-plan.md` (written 2026-07-11) states *"There is no `058`, `061`, or `062`."* That was true then. It is **now wrong about `061`** — `061_nycmaid_routing_reconcile.sql` + its verify were added after that file was written (commits `f68d1ba1`, `65dff511` and later). `058` and `062` still do not exist. This file covers `061`; treat this file as authoritative for the `061` reversal and update `rollback-plan.md`'s numbering note.

**Global rollback order = reverse of apply order:** `061 → 060 → 059 → 057 → 056 → 055-backfill → 055-add`, then the two data backfills (`pricing_model`, `owner_phone`) are independent of the tenant_domains chain and reverse on their own. Roll back only the layer that broke unless a lower layer is implicated. Run every block with `psql "$DATABASE_URL" -v ON_ERROR_STOP=1`.

`tenant_domains.created_at` **pre-exists** (migration `043_tenant_domains.sql:15`); `055` only guarded-adds it, so **no reversal drops `created_at`.**

---

## 055 — `055_tenant_domains_routing.sql`  (add columns) {#055-add}

**Applied:** added `routing_mode`, `vercel_project`, `status` (all nullable, no default), `updated_at` (`NOT NULL DEFAULT now()`), a guarded `created_at`, the two CHECK constraints, plus `tenant_domains_updated_at()` + `trg_tenant_domains_updated_at`.

**Reverse SQL** (full teardown of the schema addition; reverse order of creation; `created_at` kept):
```sql
DROP TRIGGER  IF EXISTS trg_tenant_domains_updated_at ON tenant_domains;
DROP FUNCTION IF EXISTS tenant_domains_updated_at();
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS tenant_domains_routing_mode_check;
ALTER TABLE tenant_domains DROP CONSTRAINT IF EXISTS tenant_domains_status_check;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS routing_mode;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS vercel_project;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS status;
ALTER TABLE tenant_domains DROP COLUMN IF EXISTS updated_at;
-- created_at intentionally NOT dropped (pre-existed in 043_tenant_domains.sql).
```

**Precondition:** the resolver must be back on `tenants.domain`-first (see `rollback-plan.md` step (a)) **before** dropping these columns, or W2's `tenant_domains`-first host resolution breaks. Also drop `057`'s freeze first (§057) so the legacy path is writable.

**Idempotent:** every clause is `IF EXISTS`. Safe to re-run.

**Trigger signal:** abandoning the `tenant_domains` routing model for this release entirely.

---

## 055 — `055_tenant_domains_routing.backfill.sql`  (data fill) {#055-backfill}

**Applied:** STEP 0 seeded one skeleton `tenant_domains` row per `tenants.domain` that had none (notes = `'Seeded from tenants.domain by 055 backfill (coverage for verification)'`); then filled `routing_mode` (bespoke-slug list vs `'template'`), `status` (from `active`), `vercel_project = 'fullloopcrm'`. Ends with a RAISE-only coverage gate (writes nothing).

**Reverse SQL** — only meaningful **after `056` is reversed** (can't NULL a `NOT NULL` column). Removes the seed rows and nulls the three filled columns:
```sql
DELETE FROM tenant_domains
 WHERE notes = 'Seeded from tenants.domain by 055 backfill (coverage for verification)';
UPDATE tenant_domains SET routing_mode = NULL, status = NULL, vercel_project = NULL;
```
> If doing a **full 055 teardown** (§055-add), **skip this** — the data leaves with the columns.
> The `DELETE` only removes rows this backfill created (matched by its exact `notes` string); a `tenant_domains` row that pre-existed 055 (e.g. nycmaid's 043 seeds) is left intact.

**Caveat — not a perfect pre-image:** the `UPDATE … SET NULL` blanks *every* row's three columns, including any value a human corrected by hand after the backfill. If manual corrections may exist, snapshot `SELECT id, routing_mode, status, vercel_project FROM tenant_domains` before applying the reverse.

**Trigger signal:** `routing_mode`/`status` mis-mapped for many rows and you want a clean re-fill.

---

## 056 — `056_tenant_domains_routing_enforce.sql`  (enforce) {#056}

**Applied:** `SET DEFAULT 'template'` on `routing_mode`, `SET DEFAULT 'active'` on `status`, then `SET NOT NULL` on both. `vercel_project` was **deliberately left nullable** (LEADER order 12:16) — 056 does **not** touch it.

**Reverse SQL:**
```sql
ALTER TABLE tenant_domains ALTER COLUMN routing_mode DROP NOT NULL;
ALTER TABLE tenant_domains ALTER COLUMN status       DROP NOT NULL;
ALTER TABLE tenant_domains ALTER COLUMN routing_mode DROP DEFAULT;
ALTER TABLE tenant_domains ALTER COLUMN status       DROP DEFAULT;
```
**Idempotent:** `DROP NOT NULL` / `DROP DEFAULT` are no-ops if already absent. Safe to re-run.

**Trigger signal:** a NULL `routing_mode`/`status` write path is needed, or the `NOT NULL` enforce rejects a legitimate insert.

---

## 057 — `057_freeze_tenants_domain.sql`  (legacy write-freeze) {#057}

**Applied:** `freeze_tenants_domain()` + `trg_freeze_tenants_domain` on `tenants` — raises on any INSERT with a non-null `domain` or any UPDATE that changes `domain`.

**Reverse:** the reverse file **already ships** — just run it:
```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f platform/src/lib/migrations/057_unfreeze_tenants_domain.sql
```
(That file drops `trg_freeze_tenants_domain` then `freeze_tenants_domain()`, in that order.)

**Idempotent:** unfreeze is `DROP … IF EXISTS`. Safe to re-run.

**Trigger signal:** a legitimate `tenants.domain` INSERT/UPDATE is blocked with `tenants.domain is write-frozen …`, or you are rolling the resolver back to `tenants.domain`-first (which needs the legacy column writable again).

---

## 058 — (no file) {#058}

No `058_*` exists in `platform/src/lib/migrations/`. Nothing to apply, nothing to reverse. If the leader expected an `058`, resolve the gap before treating the chain as complete.

---

## 059 — `059_backfill_vercel_project.sql`  (real vercel_project fill) {#059}

**Applied:** set determinable rows (all template tenants + 4 FL-signal bespoke tenants) to the FL project id `prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj`; reset the 18 unknown-bespoke rows from `'fullloopcrm'` back to `NULL`. Data-only; touches only its own auto-values, never a human override.

**Reverse SQL** — restore the pre-059 state (the 055 blanket `'fullloopcrm'` on every row):
```sql
UPDATE tenant_domains
   SET vercel_project = 'fullloopcrm'
 WHERE vercel_project = 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj'
    OR vercel_project IS NULL;
```
> Low-risk: `vercel_project` is deploy metadata the W2 resolver never reads. This restore is rarely needed.
> ⚠️ This blanket-writes `'fullloopcrm'` to **every** currently-NULL row, which would also overwrite a row a human intentionally left NULL. If that matters, filter to the 18 known unknown-bespoke slugs instead (list in `059`'s `unknown_slugs` array).

**Trigger signal:** an onboarding/deploy tool that reads `vercel_project` chokes on the NULLs 059 introduced.

---

## 060 — `060_lockdown_secdef_rpcs.sql`  (secdef lockdown) {#060}

**Applied:** REVOKE EXECUTE from `authenticated` + `PUBLIC` on `post_journal_entry(UUID,UUID,DATE,TEXT,TEXT,UUID,UUID,JSONB)` and `cpa_token_bump_usage(TEXT)`; kept `service_role`; pinned `search_path = public, pg_temp` on both.

**Reverse SQL** — restore migration 039's grants:
```sql
GRANT EXECUTE ON FUNCTION post_journal_entry(UUID,UUID,DATE,TEXT,TEXT,UUID,UUID,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT)                                   TO authenticated;
ALTER FUNCTION post_journal_entry(UUID,UUID,DATE,TEXT,TEXT,UUID,UUID,JSONB) RESET search_path;
ALTER FUNCTION cpa_token_bump_usage(TEXT)                                   RESET search_path;
```
> ⚠️ **Reverting 060 re-opens the cross-tenant ledger-forgery hole it closed** (any authenticated client could forge `journal_entries` into any tenant). `service_role` keeps EXECUTE under 060, so legitimate server-side calls are unaffected — **prefer leaving 060 in place.** Revert only if 060 itself is proven to break a real `service_role` call.

**Idempotent:** GRANT/RESET are repeatable. Safe to re-run.

**Trigger signal:** a legitimate server-side `post_journal_entry` / `cpa_token_bump_usage` call fails with `permission denied for function`.

---

## 061 — `061_nycmaid_routing_reconcile.sql`  (flagship routing reconcile) {#061}

**Applied:** resolved the ONE flagship tenant slug-agnostically (`slug in ('nycmaid','the-nyc-maid')`); ensured both alias domains `thenycmaid.com` + `thenewyorkcitymaid.com` exist under it (`ON CONFLICT (domain) DO NOTHING`); forced `routing_mode = 'bespoke'` on **every** flagship domain row and backfilled any NULL `status`/`vercel_project`. Guarded + in-transaction post-verify (rolls itself back on failure). Only ever writes `'bespoke'`, never `'template'`.

**Reverse SQL** — scope strictly to the flagship tenant; do NOT touch other tenants:
```sql
-- Resolve the flagship once (expect exactly one row).
-- SELECT id FROM tenants WHERE slug IN ('nycmaid','the-nyc-maid');  -- note the id, call it :FLAGSHIP

-- 1. Remove ONLY the alias rows THIS migration inserted (its exact notes string).
--    Rows that pre-existed 061 (e.g. from 043) are left intact.
DELETE FROM tenant_domains
 WHERE domain IN ('thenycmaid.com','thenewyorkcitymaid.com')
   AND notes = 'Reconciled by migration 061 (nycmaid slug/routing reconcile)';

-- 2. (Optional) revert routing_mode that 061 forced to 'bespoke' on flagship rows
--    it did NOT insert. There is NO captured pre-image, so this is a JUDGMENT call:
--    for the flagship, 'bespoke' is the CORRECT end state per the P1 spec, so the
--    usual reason to run 061 is to REACH this state — reverting routing_mode to
--    'template' would REGRESS the flagship. Only do this if the flip itself caused
--    the incident, and snapshot first:
--   CREATE TABLE IF NOT EXISTS _rollback_061_flagship AS
--     SELECT id, routing_mode FROM tenant_domains
--      WHERE tenant_id = (SELECT id FROM tenants WHERE slug IN ('nycmaid','the-nyc-maid'));
```
> ⚠️ **Asymmetric risk.** 061 only ever moves the flagship TO its correct `'bespoke'` state; a "rollback" that sets it back to `'template'` is itself a regression (the flagship serving the shared template). In almost all cases the right response to a 061 problem is to **fix forward**, not revert. Removing the inserted alias rows (step 1) is the only clearly-safe reversal, and only if those aliases must not resolve.

**Verify after any reversal:** re-run `061_nycmaid_routing_reconcile.verify.sql` to see the resulting flagship state (read-only).

**Trigger signal:** the flagship's alias hosts resolve/route wrong specifically because of 061 (e.g. an alias got attached to the wrong tenant — though 061's own swap-guard should have RAISEd rather than let that happen).

---

## 062 — (no file) {#062}

No `062_*` exists in `platform/src/lib/migrations/`. Nothing to apply, nothing to reverse.

---

## Backfill — `platform/migrations/2026_07_11_owner_phone_backfill.sql` {#owner-phone}

**Applied:** filled `tenants.owner_phone` for non-flagship tenants from, in priority order, the owner `tenant_members.phone` → converted `leads.phone` → `tenants.phone`. Only ever wrote rows where `owner_phone` was NULL/blank; excluded nycmaid + the seed tenant. Emits a blocking list of tenants still NULL.

**Mandatory pre-image (run IMMEDIATELY BEFORE the backfill):**
```sql
CREATE TABLE IF NOT EXISTS _rollback_owner_phone_20260711 AS
  SELECT id, owner_phone FROM tenants;
```
**Reverse (precise, with snapshot):**
```sql
UPDATE tenants t
   SET owner_phone = s.owner_phone
  FROM _rollback_owner_phone_20260711 s
 WHERE s.id = t.id
   AND t.owner_phone IS DISTINCT FROM s.owner_phone;
```
**Fallback (NO snapshot — last resort, destructive to any legitimately pre-existing `owner_phone`):**
```sql
UPDATE tenants SET owner_phone = NULL
 WHERE id <> '00000000-0000-0000-0000-000000000001'::uuid
   AND slug IS DISTINCT FROM 'nycmaid';
```
> **Trigger signal:** the fail-closed per-tenant owner check (commit `017043fa`, `agent.ts isOwnerOfTenant`) locks real owners **out** (wrong/blank number written), or grants owner access to a **wrong** phone (privilege escalation — revert immediately). The paired `…owner_phone_backfill.verify.sql` gate should have blocked the deploy before this shipped.

---

## Backfill — `platform/migrations/2026_07_11_pricing_model_backfill.sql` {#pricing-model}

**Applied:** re-synced `service_types.pricing_model` (and some `per_unit`) with the catalog-v2 truth — four idempotent passes that only ever move a row **off** `'hourly'` (→ `'flat'`, some → `per_unit='job'`). Excluded nycmaid + the seed tenant.

**Mandatory pre-image (run IMMEDIATELY BEFORE the backfill):**
```sql
CREATE TABLE IF NOT EXISTS _rollback_pricing_model_20260711 AS
  SELECT id, pricing_model, per_unit FROM service_types;
```
**Reverse (precise, with snapshot):**
```sql
UPDATE service_types st
   SET pricing_model = s.pricing_model,
       per_unit      = s.per_unit
  FROM _rollback_pricing_model_20260711 s
 WHERE s.id = st.id
   AND (st.pricing_model IS DISTINCT FROM s.pricing_model
        OR st.per_unit   IS DISTINCT FROM s.per_unit);
```
**Fallback (NO snapshot — last resort, over-broad, destructive to genuinely-flat pre-existing services):**
```sql
UPDATE service_types
   SET pricing_model = 'hourly'
 WHERE pricing_model = 'flat'
   AND item_type IS DISTINCT FROM 'product'
   AND tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid;
```
> **Trigger signal:** team-portal checkout (`src/app/api/team-portal/checkout/route.ts`) bills the wrong amount after the backfill (an hourly tenant flipped to flat, or vice-versa).

---

## One-line reverse per component

| Order # | File | One-line reverse | Prefer-not-to-revert? |
|---|---|---|---|
| 061 | nycmaid reconcile | `DELETE` inserted alias rows; fix-forward otherwise | **Yes** — reverting regresses flagship to template |
| 060 | secdef lockdown | GRANT `authenticated` back + RESET search_path | **Yes** — re-opens ledger-forgery hole |
| 059 | vercel backfill | `UPDATE … SET vercel_project='fullloopcrm' WHERE …` | No (metadata only) |
| 057 | freeze | run `057_unfreeze_tenants_domain.sql` | No |
| 056 | enforce | `ALTER … DROP NOT NULL / DROP DEFAULT` | No |
| 055 | backfill | `DELETE` seed rows + `UPDATE … SET NULL` (after 056 reversed) | No |
| 055 | add | `DROP` cols (keep `created_at`) | No (full teardown only) |
| — | owner_phone | restore from `_rollback_owner_phone_20260711` | No (but snapshot is mandatory) |
| — | pricing_model | restore from `_rollback_pricing_model_20260711` | No (but snapshot is mandatory) |
