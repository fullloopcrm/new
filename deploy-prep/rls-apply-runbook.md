# RLS Apply Runbook — `2026_07_11_rls_tenant_tables.sql`

**Author:** W1 (schema + backfill lane) · **Date:** 2026-07-12 · **Status:** FILE ONLY — nothing here was run. The leader executes against prod after Jeff approves.

Standing safety: W1 ran no DB command and no deploy to author this. Every command below is
for the **leader** to run.

Prereq check performed for this runbook: the migration's header comment list and its
executable `tenant_tables text[]` array were diffed programmatically — **135 names in each,
identical sets, zero drift.** (A prior pass, commit `90db8f7a`, already fixed a 135-vs-132
enumeration gap in the header's visible bullet list; this runbook re-verifies that fix holds
and finds no new drift.) Full analysis: [`rls-file-review.md`](./rls-file-review.md).

---

## What this migration does

Enables Row-Level Security + a permissive `tenant_isolation` policy
(`jwt.tenant_id = tenant_id::text`, both `USING` and `WITH CHECK`) on 135 tenant-scoped
tables. It is **defense-in-depth, not a behavior change today** — every route runs through
`supabaseAdmin` (service_role), which bypasses RLS entirely. The live isolation gate remains
app-layer `.eq('tenant_id', …)` (backstopped by `scripts/audit-tenant-scope.mjs`). This
migration adds a second, DB-level backstop that only bites if any code path ever moves to an
authenticated-JWT client.

Excluded on purpose (do NOT add `tenant_isolation` to these — see migration file's own
"EXCLUDED — DELIBERATELY KEPT DENY-ALL" section): `verification_codes`, `portal_auth_codes`,
`impersonation_events`. Adding a permissive policy to these would `OR` with their existing
`USING(false)` deny-all and re-expose auth-secret / audit rows to any tenant JWT.

## Files involved

| File | Role |
|---|---|
| `platform/src/lib/migrations/2026_07_11_rls_tenant_tables.sql` | The migration — idempotent, safe to re-run |
| `platform/src/lib/migrations/2026_07_11_rls_tenant_tables_verify.sql` | Read-only companion verify — run immediately after apply |
| `deploy-prep/rls-file-review.md` | Prior consistency review of the migration file (this runbook's prereq check) |

## Idempotency (why this is low-risk to apply)

- `ENABLE ROW LEVEL SECURITY` is a no-op if already on.
- Every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS` — safe to re-run.
- Each table is guarded by `to_regclass()` (must exist) **and** an
  `information_schema.columns` check (must actually carry `tenant_id`) — a stale/wrong name
  in the array is skipped with `RAISE NOTICE`, never an error.
- `tenant_domains`'s one non-idempotent-looking step (`DROP POLICY IF EXISTS
  "deny_all_tenant_domains"`) is itself `IF EXISTS`-guarded and only runs if the table exists.

## Apply steps

```bash
# 1. Apply the migration (idempotent — safe even if partially applied before).
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f platform/src/lib/migrations/2026_07_11_rls_tenant_tables.sql

# 2. Immediately run the read-only verify companion. PART A is a hard assertion —
#    it RAISE EXCEPTIONs (non-zero exit via psql -v ON_ERROR_STOP=1) if anything is
#    RLS-off, missing tenant_isolation, or if the deny-all trio was weakened.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f platform/src/lib/migrations/2026_07_11_rls_tenant_tables_verify.sql
```

Expect from step 2:
- `NOTICE: RLS verify PASSED: every tenant_id table is RLS-on + tenant_isolation; deny-all trio unchanged.`
- PART B: one row per `tenant_id`-bearing table (`rls_on`, `has_tenant_isolation`, `est_rows`).
  **`est_rows` must be unchanged from pre-migration values** — RLS enabling a policy does not
  touch data, and the platform still queries via service_role (bypasses RLS), so a table
  dropping to ~0 rows here would mean something else broke, not this migration. Compare
  against a `SELECT relname, reltuples FROM pg_class …` snapshot taken **before** step 1 if
  available; if not, at minimum eyeball that no row count reads suspiciously low (e.g. `0` on
  a table known to have production data).
- PART C: exactly 3 rows (`verification_codes`, `portal_auth_codes`, `impersonation_events`),
  each with `using_expr = 'false'`.

## Post-apply smoke check (app-layer, not DB)

Since every route uses `supabaseAdmin` (service_role, bypasses RLS), **no tenant site or
dashboard behavior should change.** Confirm this directly rather than assuming it:
1. Hit 2–3 live tenant sites (pick tenants from different vertical/config classes if
   possible) and confirm 200s — same check the leader already ran for the 15-table RLS gap
   migration on 2026-07-11 (referenced in the migration's own header).
2. Load `/admin` and `/dashboard` for one tenant and confirm normal read/write still works
   (e.g. a settings page load).
3. If anything 500s or a tenant page goes dark, RLS is very unlikely to be the cause (nothing
   here changes a service_role query path) — check for an unrelated concurrent deploy first,
   then fall back to rollback below only if RLS is confirmed implicated.

## Rollback

Per-table, only if a specific table's policy is implicated:

```sql
DROP POLICY IF EXISTS tenant_isolation ON public.<table>;
-- Optionally also: ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
```

Whole-migration rollback: loop the same `DROP POLICY` over all 135 names in the migration's
`tenant_tables` array. There is no bundled down-migration file — write the loop from the
array if a full rollback is ever needed (low expected likelihood: this is additive and
`supabaseAdmin` never observes RLS either way).

**tenant_domains is the one table with a real semantic rollback**, not just policy removal:
this migration drops `046_rls_deny_on_new_tables.sql`'s `deny_all_tenant_domains` policy and
replaces it with `tenant_isolation`. To fully revert `tenant_domains` to its pre-migration
state, restore the deny-all policy, not just drop `tenant_isolation`:
```sql
DROP POLICY IF EXISTS tenant_isolation ON public.tenant_domains;
CREATE POLICY "deny_all_tenant_domains" ON public.tenant_domains
  AS RESTRICTIVE FOR ALL USING (false) WITH CHECK (false);
```
(Confirm the exact policy definition against `046_rls_deny_on_new_tables.sql` before running
this — copied here from the migration's own inline description, not independently
re-verified against the 046 file's literal SQL.)

## Known non-blocking doc drift (do not let this block apply)

`rls-file-review.md` §2 flags one remaining cosmetic issue: the migration's "SOURCE OF TRUTH"
provenance comment still says `audit-tenant-scope.mjs → TENANT_TABLES … 132 tables`, but that
Set is now 135 entries (commit `680fa019` added the 3 migration-008 tables to it, after this
migration's header prose was written). The migration's actual executed array is unaffected —
already verified 135/135, exact match, this runbook's prereq check — this is purely a stale
number in a comment describing how the count was derived, not what the count is. Optional
follow-up, not a gate on applying this migration.
