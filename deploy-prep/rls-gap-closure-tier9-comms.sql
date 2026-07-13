-- =====================================================================
-- RLS GAP CLOSURE — TIER 9 (chat/comms cluster): next 10 tables of the
-- 60-table "RLS on, NO policy" follow-up set
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-coverage-audit.md — the "RLS on, NO
--   policy" class (60 tables). Continues the follow-up started in
--   deploy-prep/rls-gap-closure-tier6-messaging.sql (10 of 60, messaging/
--   Comhub/Connect), deploy-prep/rls-gap-closure-tier7-finance-hr.sql
--   (10 of 60, finance/payments + HR), and
--   deploy-prep/rls-gap-closure-tier8-crm-audit.sql (10 of 60, CRM/deals +
--   audit/AI-memory). Tier 8's own trailing note left the
--   cleaner/booking-ops cluster and the marketing/imports cluster as
--   candidates for the next batch; this file instead completes the
--   **chat/comms cluster** that tier6 started but did not finish — the 5
--   Comhub voice/calling tables tier6 deferred (it took the text-channel
--   half: threads, messages, contacts, templates, mentions,
--   channel_members, missed_call_sms) plus the remaining messaging-log /
--   broadcast tables that are comms by nature, not CRM or finance.
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
-- Policy shape (matches rls-gap-closure.sql / tier6 / tier7 / tier8 /
-- tenant-isolation-rls-plan.md Stage 1 exactly, for consistency across
-- every tier):
--   CREATE POLICY tenant_isolation ON <t>
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Selection for this batch (10 of the 60): the Comhub voice/calling
-- cluster tier6 left open (comhub_active_calls, comhub_admin_phones,
-- comhub_admin_presence, comhub_admin_voice_settings,
-- comhub_softphone_calls — call state, SIP registration, per-admin ring
-- config; app-layer call sites for 4 of these 5 were converted to
-- tenantDb in the paired fix commit this same session) plus the
-- remaining comms-log / broadcast tables: sms_logs, client_sms_messages
-- (SMS delivery + conversation logs), email_logs (email delivery log),
-- cleaner_broadcasts, cleaner_broadcast_recipients (one-to-many crew
-- broadcast messages + per-recipient delivery state).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PRECONDITION GUARD — same shape as tier6/tier7/tier8's guard, scoped
-- to this file's 10 targets.
-- ---------------------------------------------------------------------
DO $guard$
DECLARE
  _targets text[] := ARRAY[
    'comhub_active_calls','comhub_admin_phones','comhub_admin_presence',
    'comhub_admin_voice_settings','comhub_softphone_calls',
    'sms_logs','client_sms_messages','email_logs',
    'cleaner_broadcasts','cleaner_broadcast_recipients'
  ];
  _t          text;
  _null_count bigint;
  _missing    text[] := ARRAY[]::text[];
  _no_col     text[] := ARRAY[]::text[];
  _has_nulls  text[] := ARRAY[]::text[];
BEGIN
  IF array_length(_targets, 1) <> 10 THEN
    RAISE EXCEPTION 'RLS tier-9 guard: expected 10 targets, found %',
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
    RAISE EXCEPTION E'RLS tier-9 preconditions NOT met — aborting.\n'
      '  missing tables:        %\n'
      '  no tenant_id column:   %\n'
      '  NULL tenant_id rows:   %\n'
      'Resolve (backfill NULLs, reconcile table list) before applying.',
      COALESCE(array_to_string(_missing, ', '),   '(none)'),
      COALESCE(array_to_string(_no_col, ', '),    '(none)'),
      COALESCE(array_to_string(_has_nulls, ', '), '(none)');
  END IF;

  RAISE NOTICE 'RLS tier-9 guard passed: 10 targets exist, tenant_id present, zero NULLs.';
END
$guard$;

-- =====================================================================
-- TIER 9 — Chat/Comms cluster (10 of the 60 "RLS on, NO policy")
-- =====================================================================

ALTER TABLE comhub_active_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_active_calls;
CREATE POLICY tenant_isolation ON comhub_active_calls
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_admin_phones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_admin_phones;
CREATE POLICY tenant_isolation ON comhub_admin_phones
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_admin_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_admin_presence;
CREATE POLICY tenant_isolation ON comhub_admin_presence
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_admin_voice_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_admin_voice_settings;
CREATE POLICY tenant_isolation ON comhub_admin_voice_settings
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE comhub_softphone_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON comhub_softphone_calls;
CREATE POLICY tenant_isolation ON comhub_softphone_calls
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON sms_logs;
CREATE POLICY tenant_isolation ON sms_logs
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE client_sms_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON client_sms_messages;
CREATE POLICY tenant_isolation ON client_sms_messages
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON email_logs;
CREATE POLICY tenant_isolation ON email_logs
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE cleaner_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON cleaner_broadcasts;
CREATE POLICY tenant_isolation ON cleaner_broadcasts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE cleaner_broadcast_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON cleaner_broadcast_recipients;
CREATE POLICY tenant_isolation ON cleaner_broadcast_recipients
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- End of this batch (40 of 60 "RLS on, NO policy" tables covered across
-- tier6 + tier7 + tier8 + tier9). Remaining 20 of that class are NOT yet
-- proposed — next batch should continue from rls-coverage-audit.md's
-- "RLS on, NO policy" list: the cleaner/booking-ops cluster
-- (booking_team_members, cleaner_applications, client_contacts,
-- client_reviews) + the marketing/imports cluster (campaign_recipients,
-- marketing_opt_out_log, blocked_referrers, import_batches, import_rows,
-- google_posts, domain_notes, admin_tasks, bank_statements) + remaining
-- misc (platform_announcement_reads, push_subscriptions, ratings,
-- system_state, travel_time_cache, waitlist, website_visits).
-- Run the equivalent of rls-gap-closure-verify.sql (adjusted to this
-- file's 10 targets) AFTER COMMIT to confirm coverage.
-- =====================================================================

COMMIT;
