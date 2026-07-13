-- =====================================================================
-- RLS GAP CLOSURE — TIER 7 (finance/payments + HR): next 10 tables of the
-- 60-table "RLS on, NO policy" follow-up set
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-coverage-audit.md — the "RLS on, NO
--   policy" class (60 tables). Continues the follow-up started in
--   deploy-prep/rls-gap-closure-tier6-messaging.sql (10 of 60, messaging/
--   Comhub/Connect). That file's own trailing note named this exact next
--   batch: "the finance/payments cluster (payments, payroll_payments,
--   expenses, team_member_payouts, unmatched_payments, referral_commissions)
--   or the HR cluster (hr_documents, hr_document_requirements,
--   hr_document_reminders, hr_employee_profiles, hr_notes)." This file takes
--   both clusters together up to the 10-table batch size used by every prior
--   tier, deferring hr_document_reminders (the least sensitive of the 11 —
--   it only records which nudge milestone already fired, no document
--   content) to the next batch.
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
-- Table provenance note: payroll_payments and referral_commissions each have
-- TWO `CREATE TABLE IF NOT EXISTS` definitions in the migration history
-- (src/lib/migrations/008_missing_tables_and_columns.sql vs.
-- migrations/new-tables.sql / src/lib/migrations/019_referral_commissions.sql
-- respectively) — whichever ran first in a given environment is the live
-- shape. Both variants carry `tenant_id UUID NOT NULL REFERENCES tenants(id)`,
-- so the policy below is correct regardless of which shape is live.
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
-- Policy shape (matches rls-gap-closure.sql / rls-gap-closure-tier6-messaging.sql
-- / tenant-isolation-rls-plan.md Stage 1 exactly, for consistency across
-- every tier):
--   CREATE POLICY tenant_isolation ON <t>
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Selection for this batch (10 of the 60): the money-movement cluster
-- (payments, payroll_payments, expenses, team_member_payouts,
-- unmatched_payments, referral_commissions) plus the employee-PII cluster
-- (hr_employee_profiles, hr_document_requirements, hr_documents, hr_notes) —
-- prioritized because these carry financial account data / SSN-adjacent
-- documents (hr_documents: I-9/W-9/license uploads) and comp figures
-- (hr_employee_profiles.pay_rate_cents, emergency_contact info), a
-- comparable-or-higher sensitivity class to the Tier 1-5 bank_accounts/
-- bank_transactions tables already closed.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PRECONDITION GUARD — same shape as rls-gap-closure-tier6-messaging.sql's
-- guard, scoped to this file's 10 targets.
-- ---------------------------------------------------------------------
DO $guard$
DECLARE
  _targets text[] := ARRAY[
    'payments','payroll_payments','expenses','team_member_payouts',
    'unmatched_payments','referral_commissions',
    'hr_employee_profiles','hr_document_requirements','hr_documents','hr_notes'
  ];
  _t          text;
  _null_count bigint;
  _missing    text[] := ARRAY[]::text[];
  _no_col     text[] := ARRAY[]::text[];
  _has_nulls  text[] := ARRAY[]::text[];
BEGIN
  IF array_length(_targets, 1) <> 10 THEN
    RAISE EXCEPTION 'RLS tier-7 guard: expected 10 targets, found %',
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
    RAISE EXCEPTION E'RLS tier-7 preconditions NOT met — aborting.\n'
      '  missing tables:        %\n'
      '  no tenant_id column:   %\n'
      '  NULL tenant_id rows:   %\n'
      'Resolve (backfill NULLs, reconcile table list) before applying.',
      COALESCE(array_to_string(_missing, ', '),   '(none)'),
      COALESCE(array_to_string(_no_col, ', '),    '(none)'),
      COALESCE(array_to_string(_has_nulls, ', '), '(none)');
  END IF;

  RAISE NOTICE 'RLS tier-7 guard passed: 10 targets exist, tenant_id present, zero NULLs.';
END
$guard$;

-- =====================================================================
-- TIER 7 — Finance/Payments + HR (10 of the 60 "RLS on, NO policy")
-- =====================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON payments;
CREATE POLICY tenant_isolation ON payments
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON payroll_payments;
CREATE POLICY tenant_isolation ON payroll_payments
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON expenses;
CREATE POLICY tenant_isolation ON expenses
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE team_member_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON team_member_payouts;
CREATE POLICY tenant_isolation ON team_member_payouts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE unmatched_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON unmatched_payments;
CREATE POLICY tenant_isolation ON unmatched_payments
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON referral_commissions;
CREATE POLICY tenant_isolation ON referral_commissions
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE hr_employee_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON hr_employee_profiles;
CREATE POLICY tenant_isolation ON hr_employee_profiles
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE hr_document_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON hr_document_requirements;
CREATE POLICY tenant_isolation ON hr_document_requirements
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE hr_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON hr_documents;
CREATE POLICY tenant_isolation ON hr_documents
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE hr_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON hr_notes;
CREATE POLICY tenant_isolation ON hr_notes
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- End of this batch (20 of 60 "RLS on, NO policy" tables covered across
-- tier6 + tier7). Remaining 40 of that class are NOT yet proposed —
-- next batch should continue from rls-coverage-audit.md's "RLS on, NO
-- policy" list, e.g. hr_document_reminders (deferred from this batch) +
-- the CRM/deals cluster (deals, deal_activities, prospects, portal_leads,
-- lead_clicks) or the audit/security cluster (audit_logs, security_events,
-- ai_chat_logs, selena_memory, system_state).
-- Run the equivalent of rls-gap-closure-verify.sql (adjusted to this
-- file's 10 targets) AFTER COMMIT to confirm coverage.
-- =====================================================================

COMMIT;
