-- =====================================================================
-- RLS GAP CLOSURE — tenant_owner_messages (audit blind spot, not part of
-- the tracked 58-table or 60-table series)
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-gap-tenant-owner-messages-blindspot.md —
--   this table carries tenant_id and is live production traffic (platform
--   admin <-> tenant owner chat) but has NO migration file in this repo and
--   does NOT appear in deploy-prep/rls-coverage-audit.md's 132-table matrix
--   at all. Its current RLS/policy state is therefore UNKNOWN from source,
--   unlike every tier1-11 target (all of which had a migration-confirmed
--   starting state). This file's guard is stricter than tier6-11's for that
--   reason — see the extra column-type assertion below.
--
-- ***  PREP FILE — DO NOT EXECUTE AS-IS. NOT RUN BY W5. NOT IN THE APPLIED  ***
-- ***  MIGRATION SEQUENCE. The leader runs prod DDL only after Jeff         ***
-- ***  approves AND the live precondition checks in the companion .md       ***
-- ***  have been run against prod (this guard re-checks what it can, but    ***
-- ***  cannot substitute for reading pg_policies/pg_tables live first).     ***
--
-- ---------------------------------------------------------------------
-- HARD PRECONDITIONS:
--  (1) NULL-TENANT BACKFILL MUST COMPLETE FIRST. The guard below aborts if
--      any row has a NULL tenant_id.
--  (2) tenant_id MUST be column type uuid. The guard below asserts this
--      live (see WHY in the companion .md — this table has no migration to
--      confirm the type from, unlike every other tier).
--  (3) THESE POLICIES ARE INERT UNTIL THE APP USES A SCOPED CLIENT — same
--      service_role-bypasses-RLS reasoning as every other tier. Zero
--      runtime effect at deploy time.
--  (4) SCOPED-CLIENT PREREQ (SUPABASE_JWT_SECRET) NOT YET IN PROD.
-- ---------------------------------------------------------------------
--
-- Policy shape (matches every other tier in this series, for consistency):
--   CREATE POLICY tenant_isolation ON tenant_owner_messages
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Note: this policy would NOT scope platform-admin cross-tenant access
-- (admin/tenant-chats, Jefe) — those already run on supabaseAdmin
-- (service_role), which bypasses RLS entirely, same as every other tier.
-- The policy only backstops the tenant-owner-facing app-layer path
-- (dashboard/messages), which already scopes correctly via tenantDb().
-- =====================================================================

BEGIN;

DO $guard$
DECLARE
  _t          text := 'tenant_owner_messages';
  _null_count bigint;
  _col_type   text;
BEGIN
  IF to_regclass(format('public.%I', _t)) IS NULL THEN
    RAISE EXCEPTION 'RLS tenant_owner_messages guard: table does not exist in this environment — nothing to do (or wrong DB target).';
  END IF;

  SELECT data_type INTO _col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = _t AND column_name = 'tenant_id';

  IF _col_type IS NULL THEN
    RAISE EXCEPTION 'RLS tenant_owner_messages guard: no tenant_id column found — aborting.';
  END IF;

  IF _col_type <> 'uuid' THEN
    RAISE EXCEPTION 'RLS tenant_owner_messages guard: tenant_id is type % (expected uuid) — the auth.jwt() cast below assumes uuid; fix the policy cast before applying.', _col_type;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t) INTO _null_count;
  IF _null_count > 0 THEN
    RAISE EXCEPTION 'RLS tenant_owner_messages guard: % row(s) have NULL tenant_id — backfill before applying.', _null_count;
  END IF;

  RAISE NOTICE 'RLS tenant_owner_messages guard passed: table exists, tenant_id is uuid, zero NULLs.';
END
$guard$;

-- =====================================================================
-- Close the gap
-- =====================================================================

ALTER TABLE tenant_owner_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenant_owner_messages;
CREATE POLICY tenant_isolation ON tenant_owner_messages
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- After COMMIT: also backfill a tracked migration file for this table's
-- CREATE TABLE statement (see companion .md "Suggested next step") so
-- future audits stop missing it. Not part of this DDL — separate task.
-- =====================================================================

COMMIT;
