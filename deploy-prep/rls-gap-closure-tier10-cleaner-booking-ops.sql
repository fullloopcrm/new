-- =====================================================================
-- RLS GAP CLOSURE — TIER 10 (cleaner/booking-ops + marketing/imports
-- cluster, part 1): next 10 tables of the 60-table "RLS on, NO policy"
-- follow-up set
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-13.
-- Source of truth: deploy-prep/rls-coverage-audit.md — the "RLS on, NO
--   policy" class (60 tables). Continues the follow-up started in
--   deploy-prep/rls-gap-closure-tier6-messaging.sql (10 of 60),
--   deploy-prep/rls-gap-closure-tier7-finance-hr.sql (10 of 60),
--   deploy-prep/rls-gap-closure-tier8-crm-audit.sql (10 of 60), and
--   deploy-prep/rls-gap-closure-tier9-comms.sql (10 of 60, chat/comms —
--   completed that cluster). Tier 9's own trailing note named the exact
--   remaining 20 tables in three groups; this file takes the first 10:
--   the cleaner/booking-ops cluster (4) plus the first half of the
--   marketing/imports cluster (6).
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
-- Policy shape (matches rls-gap-closure.sql / tier6-9 /
-- tenant-isolation-rls-plan.md Stage 1 exactly, for consistency across
-- every tier):
--   CREATE POLICY tenant_isolation ON <t>
--     FOR ALL TO authenticated
--     USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
--     WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
--
-- Selection for this batch (10 of the 60):
--   Cleaner/booking-ops cluster (4): booking_team_members (crew↔booking
--   assignment, sibling of the already-Tier-4 booking_cleaners in the
--   58-table pass), cleaner_applications (worker applicant records),
--   client_contacts (secondary contacts on a client), client_reviews
--   (review text tied to a client).
--   Marketing/imports cluster, part 1 (6): campaign_recipients
--   (per-recipient send state for a campaign), marketing_opt_out_log
--   (opt-out/compliance trail), blocked_referrers (referral abuse
--   blocklist), import_batches / import_rows (bulk data import
--   job + row state — can carry client PII from the imported file),
--   google_posts (synced Google Business Profile post content).
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PRECONDITION GUARD — same shape as tier6-9's guard, scoped to this
-- file's 10 targets.
-- ---------------------------------------------------------------------
DO $guard$
DECLARE
  _targets text[] := ARRAY[
    'booking_team_members','cleaner_applications','client_contacts','client_reviews',
    'campaign_recipients','marketing_opt_out_log','blocked_referrers',
    'import_batches','import_rows','google_posts'
  ];
  _t          text;
  _null_count bigint;
  _missing    text[] := ARRAY[]::text[];
  _no_col     text[] := ARRAY[]::text[];
  _has_nulls  text[] := ARRAY[]::text[];
BEGIN
  IF array_length(_targets, 1) <> 10 THEN
    RAISE EXCEPTION 'RLS tier-10 guard: expected 10 targets, found %',
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
    RAISE EXCEPTION E'RLS tier-10 preconditions NOT met — aborting.\n'
      '  missing tables:        %\n'
      '  no tenant_id column:   %\n'
      '  NULL tenant_id rows:   %\n'
      'Resolve (backfill NULLs, reconcile table list) before applying.',
      COALESCE(array_to_string(_missing, ', '),   '(none)'),
      COALESCE(array_to_string(_no_col, ', '),    '(none)'),
      COALESCE(array_to_string(_has_nulls, ', '), '(none)');
  END IF;

  RAISE NOTICE 'RLS tier-10 guard passed: 10 targets exist, tenant_id present, zero NULLs.';
END
$guard$;

-- =====================================================================
-- TIER 10 — Cleaner/booking-ops + marketing/imports part 1 (10 of 60)
-- =====================================================================

ALTER TABLE booking_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON booking_team_members;
CREATE POLICY tenant_isolation ON booking_team_members
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE cleaner_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON cleaner_applications;
CREATE POLICY tenant_isolation ON cleaner_applications
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON client_contacts;
CREATE POLICY tenant_isolation ON client_contacts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON client_reviews;
CREATE POLICY tenant_isolation ON client_reviews
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON campaign_recipients;
CREATE POLICY tenant_isolation ON campaign_recipients
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE marketing_opt_out_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON marketing_opt_out_log;
CREATE POLICY tenant_isolation ON marketing_opt_out_log
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE blocked_referrers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON blocked_referrers;
CREATE POLICY tenant_isolation ON blocked_referrers
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON import_batches;
CREATE POLICY tenant_isolation ON import_batches
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON import_rows;
CREATE POLICY tenant_isolation ON import_rows
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

ALTER TABLE google_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON google_posts;
CREATE POLICY tenant_isolation ON google_posts
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- =====================================================================
-- End of this batch (50 of 60 "RLS on, NO policy" tables covered across
-- tier6-10). Remaining 10 of that class are NOT yet proposed — the final
-- batch (tier 11) should cover: domain_notes, admin_tasks,
-- bank_statements (remainder of the marketing/imports cluster) plus
-- platform_announcement_reads, push_subscriptions, ratings, system_state,
-- travel_time_cache, waitlist, website_visits (misc cluster). That tier
-- closes out the full 60-table "RLS on, NO policy" follow-up set.
-- Run the equivalent of rls-gap-closure-verify.sql (adjusted to this
-- file's 10 targets) AFTER COMMIT to confirm coverage.
-- =====================================================================

COMMIT;
