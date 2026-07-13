-- =====================================================================
-- RLS GAP CLOSURE — TIER 8 (CRM/deals + audit/AI-memory cluster): next 10
-- tables of the 60-table "RLS on, NO policy" follow-up set
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-coverage-audit.md — the "RLS on, NO
--   policy" class (60 tables). Continues the follow-up started in
--   deploy-prep/rls-gap-closure-tier6-messaging.sql (10 of 60, messaging/
--   Comhub/Connect) and deploy-prep/rls-gap-closure-tier7-finance-hr.sql
--   (10 of 60, finance/payments + HR). That file's own trailing note named
--   this exact next batch: "hr_document_reminders (deferred from this
--   batch) + the CRM/deals cluster (deals, deal_activities, prospects,
--   portal_leads, lead_clicks) or the audit/security cluster (audit_logs,
--   security_events, ai_chat_logs, selena_memory, system_state)." This file
--   takes hr_document_reminders + the full CRM/deals cluster (5) + the
--   first 4 of the audit/security cluster, deferring system_state (a
--   single-row/small config table, not per-record PII) to the next batch.
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
-- Policy shape (matches rls-gap-closure.sql / tier6 / tier7 /
-- tenant-isolation-rls-plan.md Stage 1 exactly, for consistency across
-- every tier):
--   CREATE POLICY tenant_isolation ON <t>
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Selection for this batch (10 of the 60): hr_document_reminders (the
-- deferred HR item — nudge-milestone state, low sensitivity but completes
-- the HR cluster); the CRM/deals cluster in full (deals, deal_activities,
-- prospects, portal_leads, lead_clicks — pipeline + lead PII: names,
-- emails, phones, deal values); and the first 4 of the audit/security
-- cluster (audit_logs, security_events, ai_chat_logs, selena_memory —
-- actor/action trails and AI conversation memory that can quote customer
-- PII, comparable in sensitivity to the already-closed `audit_log` table
-- from Tier 5 of the original 58). `system_state` deferred — config/flag
-- table, not a per-record PII surface, lowest priority of the remaining 30.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PRECONDITION GUARD — same shape as tier6/tier7's guard, scoped to this
-- file's 10 targets.
-- ---------------------------------------------------------------------
DO $guard$
DECLARE
  _targets text[] := ARRAY[
    'hr_document_reminders',
    'deals','deal_activities','prospects','portal_leads','lead_clicks',
    'audit_logs','security_events','ai_chat_logs','selena_memory'
  ];
  _t          text;
  _null_count bigint;
  _missing    text[] := ARRAY[]::text[];
  _no_col     text[] := ARRAY[]::text[];
  _has_nulls  text[] := ARRAY[]::text[];
BEGIN
  IF array_length(_targets, 1) <> 10 THEN
    RAISE EXCEPTION 'RLS tier-8 guard: expected 10 targets, found %',
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
    RAISE EXCEPTION E'RLS tier-8 preconditions NOT met — aborting.\n'
      '  missing tables:        %\n'
      '  no tenant_id column:   %\n'
      '  NULL tenant_id rows:   %\n'
      'Resolve (backfill NULLs, reconcile table list) before applying.',
      COALESCE(array_to_string(_missing, ', '),   '(none)'),
      COALESCE(array_to_string(_no_col, ', '),    '(none)'),
      COALESCE(array_to_string(_has_nulls, ', '), '(none)');
  END IF;

  RAISE NOTICE 'RLS tier-8 guard passed: 10 targets exist, tenant_id present, zero NULLs.';
END
$guard$;

-- =====================================================================
-- TIER 8 — CRM/Deals + Audit/AI-memory (10 of the 60 "RLS on, NO policy")
-- =====================================================================

ALTER TABLE hr_document_reminders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON hr_document_reminders;
CREATE POLICY tenant_isolation ON hr_document_reminders
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON deals;
CREATE POLICY tenant_isolation ON deals
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON deal_activities;
CREATE POLICY tenant_isolation ON deal_activities
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON prospects;
CREATE POLICY tenant_isolation ON prospects
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE portal_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON portal_leads;
CREATE POLICY tenant_isolation ON portal_leads
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE lead_clicks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON lead_clicks;
CREATE POLICY tenant_isolation ON lead_clicks
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON security_events;
CREATE POLICY tenant_isolation ON security_events
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON ai_chat_logs;
CREATE POLICY tenant_isolation ON ai_chat_logs
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE selena_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON selena_memory;
CREATE POLICY tenant_isolation ON selena_memory
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- End of this batch (30 of 60 "RLS on, NO policy" tables covered across
-- tier6 + tier7 + tier8). Remaining 30 of that class are NOT yet proposed
-- — next batch should continue from rls-coverage-audit.md's "RLS on, NO
-- policy" list: system_state (deferred from this batch) + the
-- cleaner/booking-ops cluster (booking_team_members, cleaner_applications,
-- cleaner_broadcasts, cleaner_broadcast_recipients, client_contacts,
-- client_reviews, client_sms_messages) or the marketing/imports cluster
-- (campaign_recipients, marketing_opt_out_log, blocked_referrers,
-- import_batches, import_rows, google_posts, domain_notes, email_logs,
-- admin_tasks, bank_statements).
-- Run the equivalent of rls-gap-closure-verify.sql (adjusted to this
-- file's 10 targets) AFTER COMMIT to confirm coverage.
-- =====================================================================

COMMIT;
