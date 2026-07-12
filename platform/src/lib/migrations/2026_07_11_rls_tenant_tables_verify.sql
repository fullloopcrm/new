-- 2026_07_11_rls_tenant_tables_verify.sql
-- Companion verification for 2026_07_11_rls_tenant_tables.sql.
--
-- Run AFTER applying the RLS migration. READ-ONLY: only SELECTs + a DO block
-- that RAISEs — no DDL, no writes, no data change. Safe to re-run any time.
--
-- ── PASS CRITERIA ───────────────────────────────────────────────────────────
--   Let T = every table in schema `public` that carries a `tenant_id` column.
--   • Every table in T has RLS enabled AND a policy named `tenant_isolation`,
--     EXCEPT the 3 deliberate deny-all tables below.
--   • The 3 deny-all tables (verification_codes, portal_auth_codes,
--     impersonation_events) still carry a deny-all policy (USING = false) and
--     do NOT carry a permissive `tenant_isolation` policy — adding one would OR
--     with the deny-all and re-expose auth-secret / audit rows. See the parent
--     migration's "EXCLUDED — DELIBERATELY KEPT DENY-ALL" section.
--
-- The deny-all set here MIRRORS the parent migration's exclusion list. If the
-- live DB legitimately holds ADDITIONAL deny-all tenant tables beyond these 3,
-- PART A will surface them as violations (RLS-on but no tenant_isolation) so the
-- operator investigates rather than silently passing — that is the intended,
-- loud-on-anything-unexpected posture for a verification file.
--
-- ── PART A — HARD ASSERTION (fails loud on any drift) ───────────────────────
DO $$
DECLARE
  deny_all constant text[] :=
    ARRAY['verification_codes','portal_auth_codes','impersonation_events'];
  r          record;
  has_tiso   boolean;   -- has a `tenant_isolation` policy
  has_deny   boolean;   -- has a policy whose USING expression is literally false
  violations int := 0;
BEGIN
  FOR r IN
    SELECT c.relname, c.oid, c.relrowsecurity AS rls_on
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE c.relkind = 'r'
       AND EXISTS (
         SELECT 1 FROM information_schema.columns col
          WHERE col.table_schema = 'public'
            AND col.table_name   = c.relname
            AND col.column_name  = 'tenant_id'
       )
     ORDER BY c.relname
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM pg_policy p
       WHERE p.polrelid = r.oid AND p.polname = 'tenant_isolation'
    ) INTO has_tiso;

    IF r.relname = ANY(deny_all) THEN
      -- Deny-all trio: must NOT have tenant_isolation, and must still deny-all.
      SELECT EXISTS (
        SELECT 1 FROM pg_policy p
         WHERE p.polrelid = r.oid
           AND lower(coalesce(pg_get_expr(p.polqual, p.polrelid), '')) = 'false'
      ) INTO has_deny;

      IF has_tiso THEN
        RAISE WARNING 'VIOLATION: deny-all table % unexpectedly has a tenant_isolation policy', r.relname;
        violations := violations + 1;
      END IF;
      IF NOT has_deny THEN
        RAISE WARNING 'VIOLATION: deny-all table % lost its USING(false) policy', r.relname;
        violations := violations + 1;
      END IF;
    ELSE
      -- Every other tenant_id table must be RLS-on + tenant_isolation.
      IF NOT r.rls_on THEN
        RAISE WARNING 'VIOLATION: % has RLS DISABLED', r.relname;
        violations := violations + 1;
      END IF;
      IF NOT has_tiso THEN
        RAISE WARNING 'VIOLATION: % is missing its tenant_isolation policy', r.relname;
        violations := violations + 1;
      END IF;
    END IF;
  END LOOP;

  IF violations > 0 THEN
    RAISE EXCEPTION 'RLS verify FAILED: % violation(s) — see WARNINGs above', violations;
  END IF;
  RAISE NOTICE 'RLS verify PASSED: every tenant_id table is RLS-on + tenant_isolation; deny-all trio unchanged.';
END $$;

-- ── PART B — PER-TABLE REPORT (rls_on / policy / row estimate) ──────────────
-- One row per tenant_id-bearing table. `est_rows` is the planner estimate
-- (pg_class.reltuples) — no full scan; run ANALYZE first if a table is stale.
-- Because the platform queries through service_role (which BYPASSES RLS),
-- est_rows must be UNCHANGED by this migration — a table dropping to ~0 would
-- signal an unexpected access-path regression to investigate.
SELECT
  c.relname                                                       AS table_name,
  c.relrowsecurity                                                AS rls_on,
  EXISTS (SELECT 1 FROM pg_policy p
           WHERE p.polrelid = c.oid AND p.polname = 'tenant_isolation') AS has_tenant_isolation,
  (c.relname = ANY (ARRAY['verification_codes','portal_auth_codes','impersonation_events']))
                                                                  AS is_deny_all_by_design,
  c.reltuples::bigint                                             AS est_rows
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
 WHERE c.relkind = 'r'
   AND EXISTS (
     SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema = 'public'
        AND col.table_name   = c.relname
        AND col.column_name  = 'tenant_id'
   )
 ORDER BY rls_on, has_tenant_isolation, c.relname;

-- ── PART C — DENY-ALL TRIO STILL DENIES (explicit) ──────────────────────────
-- Expect exactly the 3 rows, each with using_expr = 'false'. A missing row or a
-- non-false expression means the deny-all was weakened.
SELECT
  p.polrelid::regclass                       AS table_name,
  p.polname                                  AS policy_name,
  pg_get_expr(p.polqual, p.polrelid)         AS using_expr
  FROM pg_policy p
 WHERE p.polrelid::regclass::text IN
       ('verification_codes','portal_auth_codes','impersonation_events')
 ORDER BY table_name, policy_name;
