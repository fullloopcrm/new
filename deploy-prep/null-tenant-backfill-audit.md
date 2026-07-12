# NULL-tenant-id backfill — audit + PREP

_Author: worker W5, branch `p1-w5`, 2026-07-12. **Docs + PREP files only — no DDL/DML run, no prod changes.**_

## What this is

The ADR 0005 / `tenant-isolation-rls-plan.md` **hard precondition** before any RLS
policy can enforce: every row that RLS will scope must have a non-NULL `tenant_id`.
Once `deploy-prep/rls-gap-closure.sql` enables `tenant_id = <jwt claim>` policies,
any NULL-tenant_id row matches no tenant and **silently vanishes** from every
scoped-client read. This audit maps which of the flagged tables could hold NULLs,
and the two companion files backfill + prove them clean:

- `deploy-prep/null-tenant-backfill.sql` — idempotent backfill (NULL → nycmaid), FILE ONLY.
- `deploy-prep/null-tenant-backfill-verify.sql` — read-only census + pass/fail proof.

## ⚠️ Method & limitation — read first

This is **derived from the migration files** (`platform/migrations/*.sql` +
`platform/src/lib/migrations/*.sql`), **not a live DB read.** It tells us how each
table's `tenant_id` column is *declared* (NOT NULL vs nullable), which bounds
whether NULLs are *possible* — it does **not** tell us how many NULL rows prod
actually holds, nor whether a given migration was ever applied. The live NULL
counts come only from running the verify query (Query A-EXEC / Query B), which W5
cannot run. Treat the "NOT NULL → 0 NULLs" rows as *expected*, provable only by
the verify.

## Scope

The 118 flagged tenant tables from `deploy-prep/rls-coverage-audit.md`:
**58 no-RLS + 60 policy-less.** Of these, **116 are backfill targets**; 2 are
excluded because their NULLs are semantically valid (below).

## Headline finding

| `tenant_id` declaration (migration-derived) | Count | Meaning |
|---|---:|---|
| **NOT NULL** (core backfill loop) | 56 | backfilled + NOT NULL + default nycmaid by `2026_05_09_tenant_id_core.sql` |
| **NOT NULL** (declared inline / ALTER) | 59 | column created / altered `NOT NULL` in its own migration |
| **NULLABLE** | 3 | `client_referral_stats`, `system_state`, `prospects` |

So **115 of 118** flagged tables cannot hold NULL `tenant_id` *if their migration
was applied* — for them the backfill is a no-op safety net. Only **3** are
nullable, and only **1** of those is a genuine backfill target.

## The 3 nullable tables — disposition

| Table | Flagged as | Decl. | Disposition |
|---|---|---|---|
| `client_referral_stats` | no-RLS (58) | `uuid references tenants(id)` (nullable) | **BACKFILL** — genuinely tenant-scoped; the one real NULL risk. Optional `SET NOT NULL` provided (commented) to lock it after backfill. |
| `system_state` | policy-less (60) | `uuid references tenants(id)` (nullable) | **EXCLUDE** — GLOBAL platform-flags table; core migration excludes it as global. NULL = "platform-wide". Backfilling to nycmaid would wrongly scope a global flag. Must **not** be RLS-tenant-scoped either. |
| `prospects` | policy-less (60) | `uuid references tenants(id) ON DELETE SET NULL` — comment "Resulting tenant" | **EXCLUDE** — this is a *converted-tenant pointer* (like `partner_requests.converted_tenant_id`), not a scoping column. NULL = "not yet converted", a valid state. Backfilling would falsely claim every prospect became nycmaid. Must **not** be RLS-tenant-scoped either. |

`travel_time_cache` is **not** in this nullable set: the core migration header
calls it "excluded as global," but that only means excluded from the backfill
*loop* — its own `CREATE TABLE` declares `tenant_id UUID NOT NULL`, so it is
already 0-NULL and correctly tenant-scoped (`UNIQUE(tenant_id, origin…, dest…)`).

## Backfill design (see the .sql for the enforced version)

- **Targets:** the 116 tenant-scoped flagged tables (118 − `system_state` − `prospects`).
- **Action:** `UPDATE <t> SET tenant_id = nycmaid WHERE tenant_id IS NULL`, per table,
  guarded by table-exists + column-exists checks (skip-with-NOTICE otherwise).
- **Guards nycmaid rows:** the `WHERE tenant_id IS NULL` clause means existing
  non-NULL rows — nycmaid's own and any other tenant's — are **never** touched or
  reassigned. Only orphan/legacy NULLs are filled.
- **Idempotent:** re-runs find 0 NULLs and no-op.
- **nycmaid id:** `00000000-0000-0000-0000-000000000001` (per core migration).

### The one assumption (assumption-stacking)

Assigning NULLs to nycmaid is correct only if every legacy NULL belongs to
nycmaid. Per the core migration, nycmaid is the origin tenant and all
pre-tenant-id data is nycmaid's — true for legacy NULLs. **But** if prod now has
multiple live tenants, a NULL could be another tenant's orphan with no signal to
attribute it. → **Run the verify census (Query A-EXEC) FIRST and eyeball the
counts.** If any table shows a non-trivial NULL count, a human decides attribution
before applying. Do not apply blind.

## Absent-column case

If a flagged table's `tenant_id` column is *absent* in prod (its ADD-COLUMN
migration never applied), the backfill **skips it with a NOTICE** — a backfill
cannot fill a column that doesn't exist. That is a schema gap for a separate
ADD-COLUMN migration, and the verify's Query A / Query B surface it. Migration-
derived, all 118 have a `tenant_id` column defined *somewhere*; absence would only
show up as an unapplied migration, which is exactly what the live verify catches.

## Apply order (for the leader / Jeff — NOT run here)

1. Run `null-tenant-backfill-verify.sql` **Query A-EXEC** on prod → eyeball NULL counts.
2. If counts are as expected (near-zero, nycmaid-attributable), run
   `null-tenant-backfill.sql` (review NOTICEs, then COMMIT).
3. Optionally uncomment the `client_referral_stats … SET NOT NULL` lock.
4. Run **Query B** → must print `PASS` (0 NULLs). Only then is
   `rls-gap-closure.sql` safe to apply (its own guard re-checks this anyway).
