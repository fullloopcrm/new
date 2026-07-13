-- =====================================================================
-- RLS GAP CLOSURE — TIER 6 (messaging/comhub/connect): first 10 tables of
-- the 60-table "RLS on, NO policy" follow-up set
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-coverage-audit.md — the "RLS on, NO
--   policy" class (60 tables). rls-tier-rollout-order.md explicitly scoped
--   that class OUT of the original 58-table (Tier 1-5) pass as "a separate
--   follow-up, not this 58-table enable pass" — this file is that follow-up,
--   starting with the messaging/Comhub/Connect subset (this worker's lane;
--   directly upstream of the tenantDb() conversions landed this session on
--   connect_channels/connect_messages/connect_read_cursors and the comhub_*
--   routes).
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
-- ---------------------------------------------------------------------
--
-- Policy shape (matches rls-gap-closure.sql / tenant-isolation-rls-plan.md
-- Stage 1 exactly, for consistency across every tier):
--   CREATE POLICY tenant_isolation ON <t>
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Selection for this batch (10 of the 60): the messaging/Comhub/Connect
-- subset, prioritized because it's this worker's active lane and because
-- comhub_messages/comhub_threads carry message bodies (customer-facing
-- chat text) — comparable sensitivity to the Tier-1 sms_conversation*
-- tables already closed in the 58-table pass.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PRECONDITION GUARD — same shape as rls-gap-closure.sql's guard, scoped
-- to this file's 10 targets.
-- ---------------------------------------------------------------------
DO $guard$
DECLARE
  _targets text[] := ARRAY[
    'connect_channels','connect_messages','connect_read_cursors',
    'comhub_threads','comhub_messages','comhub_contacts','comhub_templates',
    'comhub_mentions','comhub_channel_members','comhub_missed_call_sms'
  ];
  _t          text;
  _null_count bigint;
  _missing    text[] := ARRAY[]::text[];
  _no_col     text[] := ARRAY[]::text[];
  _has_nulls  text[] := ARRAY[]::text[];
BEGIN
  IF array_length(_targets, 1) <> 10 THEN
    RAISE EXCEPTION 'RLS tier-6 guard: expected 10 targets, found %',
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
    RAISE EXCEPTION E'RLS tier-6 preconditions NOT met — aborting.\n'
      '  missing tables:        %\n'
      '  no tenant_id column:   %\n'
      '  NULL tenant_id rows:   %\n'
      'Resolve (backfill NULLs, reconcile table list) before applying.',
      COALESCE(array_to_string(_missing, ', '),   '(none)'),
      COALESCE(array_to_string(_no_col, ', '),    '(none)'),
      COALESCE(array_to_string(_has_nulls, ', '), '(none)');
  END IF;

  RAISE NOTICE 'RLS tier-6 guard passed: 10 targets exist, tenant_id present, zero NULLs.';
END
$guard$;

-- =====================================================================
-- TIER 6 — Messaging / Comhub / Connect (10 of the 60 "RLS on, NO policy")
-- =====================================================================

ALTER TABLE connect_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON connect_channels;
CREATE POLICY tenant_isolation ON connect_channels
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE connect_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON connect_messages;
CREATE POLICY tenant_isolation ON connect_messages
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE connect_read_cursors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON connect_read_cursors;
CREATE POLICY tenant_isolation ON connect_read_cursors
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_threads;
CREATE POLICY tenant_isolation ON comhub_threads
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_messages;
CREATE POLICY tenant_isolation ON comhub_messages
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_contacts;
CREATE POLICY tenant_isolation ON comhub_contacts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_templates;
CREATE POLICY tenant_isolation ON comhub_templates
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_mentions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_mentions;
CREATE POLICY tenant_isolation ON comhub_mentions
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_channel_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_channel_members;
CREATE POLICY tenant_isolation ON comhub_channel_members
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_missed_call_sms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_missed_call_sms;
CREATE POLICY tenant_isolation ON comhub_missed_call_sms
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- End of this batch (10 of 60 "RLS on, NO policy" tables covered).
-- Remaining 50 of that class are NOT yet proposed — next batch should
-- continue from rls-coverage-audit.md's "RLS on, NO policy" list, e.g.
-- the finance/payments cluster (payments, payroll_payments, expenses,
-- team_member_payouts, unmatched_payments, referral_commissions) or the
-- HR cluster (hr_documents, hr_document_requirements, hr_document_reminders,
-- hr_employee_profiles, hr_notes).
-- Run the equivalent of rls-gap-closure-verify.sql (adjusted to this
-- file's 10 targets) AFTER COMMIT to confirm coverage.
-- =====================================================================

COMMIT;
