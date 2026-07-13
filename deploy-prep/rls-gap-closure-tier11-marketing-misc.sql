-- =====================================================================
-- RLS GAP CLOSURE — TIER 11 (marketing/imports part 2 + misc cluster):
-- final 10 tables of the 60-table "RLS on, NO policy" follow-up set
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-coverage-audit.md — the "RLS on, NO
--   policy" class (60 tables). Completes the follow-up started in
--   deploy-prep/rls-gap-closure-tier6-messaging.sql (10 of 60),
--   deploy-prep/rls-gap-closure-tier7-finance-hr.sql (10 of 60),
--   deploy-prep/rls-gap-closure-tier8-crm-audit.sql (10 of 60),
--   deploy-prep/rls-gap-closure-tier9-comms.sql (10 of 60), and
--   deploy-prep/rls-gap-closure-tier10-cleaner-booking-ops.sql (10 of
--   60). This is the last 10: domain_notes, admin_tasks, bank_statements
--   (remainder of the marketing/imports cluster) plus
--   platform_announcement_reads, push_subscriptions, ratings,
--   system_state, travel_time_cache, waitlist, website_visits (misc).
--   After this file, all 60 "RLS on, NO policy" tables named in
--   rls-coverage-audit.md have a proposed tenant_isolation policy.
--
-- ***  PREP FILE — DO NOT EXECUTE AS-IS. NOT RUN BY W5. NOT IN THE APPLIED  ***
-- ***  MIGRATION SEQUENCE. The leader runs prod DDL only after Jeff         ***
-- ***  approves and the HARD PRECONDITIONS below are met.                   ***
--
-- ---------------------------------------------------------------------
-- WHY THIS TIER DIFFERS FROM THE 58-TABLE PASS (rls-gap-closure.sql):
-- Every target below ALREADY has `ENABLE ROW LEVEL SECURITY` set (per the
-- audit) — the gap here is that RLS enforces default-deny for non-service
-- roles but has ZERO positive tenant policy. The `ALTER TABLE ... ENABLE`
-- statements below are included anyway for idempotent safety (a no-op if
-- already on) in case the migration-derived audit is stale vs. live prod —
-- see rls-coverage-audit.md's own caveat that it is not a live pg_policies
-- read.
--
-- HARD PRECONDITIONS (same as rls-gap-closure.sql, per ADR 0005 /
-- tenant-isolation-rls-plan.md):
--  (1) NULL-TENANT BACKFILL MUST COMPLETE FIRST for these 10 tables too.
--      The guard block below re-checks this and aborts before enabling
--      anything if any target still has a NULL tenant_id row.
--  (2) THESE POLICIES ARE INERT UNTIL THE APP USES A SCOPED CLIENT — same
--      service_role-bypasses-RLS reasoning as the Tier 1-5 file. Zero
--      runtime effect at deploy time.
--  (3) SCOPED-CLIENT PREREQ (SUPABASE_JWT_SECRET) NOT YET IN PROD — same
--      as Tier 1-5.
--  (4) `system_state` / `travel_time_cache` — flagged in
--      rls-coverage-audit.md as tables the core tenant_id backfill
--      migration's own header calls "EXCLUDED as global," but each still
--      defines a `tenant_id` column and is included in the audit's
--      132-table matrix. Confirm live backfill state for these two
--      specifically before this tier applies — do not assume they were
--      swept by the same backfill pass as the rest.
-- ---------------------------------------------------------------------
--
-- Policy shape (matches rls-gap-closure.sql / tier6-10 /
-- tenant-isolation-rls-plan.md Stage 1 exactly, for consistency across
-- every tier):
--   CREATE POLICY tenant_isolation ON <t>
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Selection for this batch (final 10 of the 60):
--   Marketing/imports cluster, part 2 (3): domain_notes (notes on a
--   tenant's owned domain), admin_tasks (internal admin task list —
--   grouped here per the audit's own placement, not a distinct cluster),
--   bank_statements (raw imported bank statement records, sibling of the
--   already-covered bank_import_batches path).
--   Misc cluster (7): platform_announcement_reads (per-member read
--   receipts on platform announcements), push_subscriptions (web push
--   endpoint + keys — secret-adjacent), ratings (service rating text),
--   system_state (tenant-scoped runtime state flags), travel_time_cache
--   (routing/ETA cache, low sensitivity), waitlist (signup queue,
--   contact PII), website_visits (analytics/traffic log).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PRECONDITION GUARD — same shape as tier6-10's guard, scoped to this
-- file's 10 targets.
-- ---------------------------------------------------------------------
DO $guard$
DECLARE
  _targets text[] := ARRAY[
    'domain_notes','admin_tasks','bank_statements',
    'platform_announcement_reads','push_subscriptions','ratings',
    'system_state','travel_time_cache','waitlist','website_visits'
  ];
  _t          text;
  _null_count bigint;
  _missing    text[] := ARRAY[]::text[];
  _no_col     text[] := ARRAY[]::text[];
  _has_nulls  text[] := ARRAY[]::text[];
BEGIN
  IF array_length(_targets, 1) <> 10 THEN
    RAISE EXCEPTION 'RLS tier-11 guard: expected 10 targets, found %',
      array_length(_targets, 1);
  END IF;

  FOREACH _t IN ARRAY _targets LOOP
    IF to_regclass(format('public.%I', _t)) IS NULL THEN
      _missing := _missing || _t;
      CONTINUE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _t
        AND column_name = 'tenant_id'
    ) THEN
      _no_col := _no_col || _t;
      CONTINUE;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t)
      INTO _null_count;
    IF _null_count > 0 THEN
      _has_nulls := _has_nulls || format('%s(%s)', _t, _null_count);
    END IF;
  END LOOP;

  IF array_length(_missing, 1) > 0
     OR array_length(_no_col, 1) > 0
     OR array_length(_has_nulls, 1) > 0 THEN
    RAISE EXCEPTION E'RLS tier-11 preconditions NOT met — aborting.\n'
      '  missing tables:        %\n'
      '  no tenant_id column:   %\n'
      '  NULL tenant_id rows:   %\n'
      'Resolve (backfill NULLs, reconcile table list) before applying.',
      COALESCE(array_to_string(_missing, ', '),   '(none)'),
      COALESCE(array_to_string(_no_col, ', '),    '(none)'),
      COALESCE(array_to_string(_has_nulls, ', '), '(none)');
  END IF;

  RAISE NOTICE 'RLS tier-11 guard passed: 10 targets exist, tenant_id present, zero NULLs.';
END
$guard$;

-- =====================================================================
-- TIER 11 — Marketing/imports part 2 + misc (final 10 of 60)
-- =====================================================================

ALTER TABLE domain_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON domain_notes;
CREATE POLICY tenant_isolation ON domain_notes
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON admin_tasks;
CREATE POLICY tenant_isolation ON admin_tasks
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON bank_statements;
CREATE POLICY tenant_isolation ON bank_statements
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE platform_announcement_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON platform_announcement_reads;
CREATE POLICY tenant_isolation ON platform_announcement_reads
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON push_subscriptions;
CREATE POLICY tenant_isolation ON push_subscriptions
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ratings;
CREATE POLICY tenant_isolation ON ratings
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON system_state;
CREATE POLICY tenant_isolation ON system_state
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE travel_time_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON travel_time_cache;
CREATE POLICY tenant_isolation ON travel_time_cache
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON waitlist;
CREATE POLICY tenant_isolation ON waitlist
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON website_visits;
CREATE POLICY tenant_isolation ON website_visits
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- End of this batch — ALL 60 of the "RLS on, NO policy" tables from
-- rls-coverage-audit.md now have a proposed tenant_isolation policy
-- across tier6 (10), tier7 (10), tier8 (10), tier9 (10), tier10 (10),
-- and this file (10) = 60/60.
--
-- What's still open after tier6-11 (not part of this follow-up set):
--  - The 58-table "GAP — no RLS" class (rls-gap-closure.sql /
--    rls-tier-rollout-order.md) — a fully separate, already-ordered
--    5-tier plan; not touched by tier6-11.
--  - The 11 "RLS on, deny-all stub" tables — intentional blanket-deny,
--    not tenant-scoped by design; adding a positive policy there is a
--    scope change to their access model, not a gap-closure follow-up.
--  - The 2 "RLS on, public-read" tables (territories, territory_claims)
--    — intentionally cross-tenant reference data.
--
-- Run the equivalent of rls-gap-closure-verify.sql (adjusted to this
-- file's 10 targets) AFTER COMMIT to confirm coverage. Once tier6-11 are
-- all applied and verified, re-run rls-coverage-audit.md's live
-- verification SQL against prod to confirm the "RLS on, NO policy" class
-- has dropped from 60 to 0.
-- =====================================================================

COMMIT;
