-- =====================================================================
-- NULL-TENANT-ID BACKFILL — the HARD PRECONDITION before any RLS enforces
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-12.
-- Source of truth: deploy-prep/rls-coverage-audit.md (the 58 no-RLS +
--   60 policy-less tenant tables) and deploy-prep/null-tenant-backfill-audit.md
--   (per-table NULL/absent classification). Companion verify:
--   deploy-prep/null-tenant-backfill-verify.sql.
--
-- ***  PREP FILE — DO NOT EXECUTE AS-IS. NOT RUN BY W5. NOT IN THE APPLIED  ***
-- ***  MIGRATION SEQUENCE. The leader runs prod DDL/DML only after Jeff     ***
-- ***  approves AND the verify query below has been eyeballed first.        ***
--
-- ---------------------------------------------------------------------
-- WHY THIS FILE EXISTS (ADR 0005 / tenant-isolation-rls-plan.md)
--
--   Once RLS is enabled with a `tenant_id = <jwt claim>` policy (see
--   deploy-prep/rls-gap-closure.sql), any row whose tenant_id IS NULL matches
--   NO tenant and DISAPPEARS from every scoped-client read — silent data loss
--   from the app's point of view. So: EVERY target row must have a non-NULL
--   tenant_id BEFORE RLS is turned on. That is exactly what this file
--   guarantees. rls-gap-closure.sql's precondition guard REFUSES to run while
--   any target still holds a NULL tenant_id; this backfill is what clears it.
--
-- ---------------------------------------------------------------------
-- WHAT THIS DOES / DOES NOT DO
--
--   DOES:  for each of the 116 tenant-SCOPED flagged tables, set
--          tenant_id = nycmaid ('00000000-0000-0000-0000-000000000001')
--          for rows WHERE tenant_id IS NULL. Idempotent (re-runnable; a second
--          run finds 0 NULLs and no-ops). Missing table / missing tenant_id
--          column is SKIPPED with a NOTICE (a schema-add is a different
--          migration's job, and the verify query flags it).
--
--   GUARDS NYCMAID ROWS:  the WHERE tenant_id IS NULL clause means existing
--          non-NULL rows are NEVER touched or reassigned — nycmaid's own rows,
--          and any other tenant's rows, are left exactly as they are. Only
--          orphan/legacy NULL rows are filled.
--
--   DOES NOT:  enable RLS, create policies, drop columns, or set NOT NULL on
--          the 115 already-NOT-NULL targets (their schema is already correct).
--          A narrow, OPTIONAL SET NOT NULL for the one genuinely-nullable
--          target is at the bottom, commented out.
--
-- ---------------------------------------------------------------------
-- THE ONE ASSUMPTION — READ BEFORE APPLYING (assumption-stacking)
--
--   Assigning NULL rows to nycmaid is correct ONLY IF every legacy NULL
--   tenant_id row genuinely belongs to nycmaid. Per
--   platform/migrations/2026_05_09_tenant_id_core.sql, nycmaid is the origin
--   tenant and ALL pre-tenant-id data is nycmaid's, so this holds for legacy
--   NULLs. BUT if prod now has multiple live tenants, a NULL row could in
--   principle be another tenant's orphan. There is no other signal to attribute
--   it. THEREFORE: run deploy-prep/null-tenant-backfill-verify.sql FIRST and
--   eyeball the per-table NULL counts. If any table shows a non-trivial NULL
--   count, a human must decide attribution before this file is applied. Do not
--   apply blind.
--
-- ---------------------------------------------------------------------
-- MIGRATION-DERIVED EXPECTATION (not a live read)
--
--   Per the audit doc, 115 of the 118 flagged tables already declare
--   tenant_id NOT NULL in migrations, so IF those migrations were applied to
--   prod, this backfill is a 116-table no-op except possibly
--   client_referral_stats (the lone tenant-scoped NULLABLE column). The value
--   of running it anyway is belt-and-suspenders: it makes the 0-NULL
--   precondition TRUE and PROVEN regardless of which migrations actually
--   landed in prod. The verify query is the proof.
--
-- EXCLUDED from backfill (2 of the 118 flagged — backfilling would CORRUPT):
--   - system_state : nullable, GLOBAL platform flags. Core migration
--     explicitly excludes it as global; a NULL tenant_id here means
--     "platform-wide", not "missing". Filling it with nycmaid would wrongly
--     scope a global flag to one tenant.
--   - prospects    : tenant_id is a "resulting/converted tenant" pointer
--     (declared `ON DELETE SET NULL`, comment "Resulting tenant"), like
--     partner_requests.converted_tenant_id. NULL = "not yet converted", a
--     valid state. Filling it would falsely claim every prospect became
--     nycmaid. These two must NOT be tenant-scoped by RLS either.
-- =====================================================================

BEGIN;

DO $backfill$
DECLARE
  nycmaid_id constant uuid := '00000000-0000-0000-0000-000000000001';
  _targets text[] := ARRAY[
    'accounting_periods','admin_tasks','ai_chat_logs','audit_log',
    'audit_logs','bank_accounts','bank_import_batches','bank_statements',
    'bank_transactions','blocked_referrers','booking_cleaners','booking_notes',
    'booking_team_members','bookings','campaign_recipients','campaigns',
    'categorization_patterns','chart_of_accounts','cleaner_applications','cleaner_broadcast_recipients',
    'cleaner_broadcasts','cleaner_payouts','cleaners','client_contacts',
    'client_referral_stats','client_reviews','client_sms_messages','clients',
    'comhub_active_calls','comhub_admin_phones','comhub_admin_presence','comhub_admin_voice_settings',
    'comhub_channel_members','comhub_contacts','comhub_mentions','comhub_messages',
    'comhub_missed_call_sms','comhub_softphone_calls','comhub_templates','comhub_threads',
    'connect_channels','connect_messages','connect_read_cursors','cpa_access_tokens',
    'crews','deal_activities','deals','document_activity',
    'document_fields','document_signers','documents','domain_notes',
    'email_logs','entities','error_logs','expenses',
    'google_posts','google_reviews','hr_document_reminders','hr_document_requirements',
    'hr_documents','hr_employee_profiles','hr_notes','import_batches',
    'import_rows','invoice_activity','invoices','job_events',
    'job_payments','jobs','journal_entries','journal_lines',
    'lead_clicks','management_application_drafts','management_applications','marketing_opt_out_log',
    'member_pin_reset_codes','notifications','oauth_state_nonces','outreach_log',
    'payments','payroll_payments','platform_announcement_reads','portal_leads',
    'products','projects','push_subscriptions','quote_activity',
    'quote_templates','quotes','ratings','recurring_expenses',
    'recurring_schedules','referral_commissions','referrers','reviews',
    'routes','sales_applications','schedule_issues','security_events',
    'selena_memory','settings','sms_conversation_messages','sms_conversations',
    'sms_logs','team_applications','team_member_payouts','team_notifications',
    'tenant_invites','tenant_settings','travel_time_cache','unmatched_payments',
    'waitlist','website_visits','yinez_memory','yinez_skills'
  ];
  _t             text;
  _rows          bigint;
  _total_filled  bigint := 0;
  _skipped_tbl   text[] := ARRAY[]::text[];
  _skipped_col   text[] := ARRAY[]::text[];
  _filled        text[] := ARRAY[]::text[];
BEGIN
  -- Sanity: the target list must be exactly the 116 tenant-scoped flagged
  -- tables (118 flagged - system_state - prospects).
  IF array_length(_targets, 1) <> 116 THEN
    RAISE EXCEPTION 'null-tenant backfill: expected 116 targets, found %',
      array_length(_targets, 1);
  END IF;

  -- Precondition: the nycmaid tenant row must exist (we assign NULLs to it).
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = nycmaid_id) THEN
    RAISE EXCEPTION 'null-tenant backfill: nycmaid tenant % not found in public.tenants — refusing to backfill to a non-existent tenant.',
      nycmaid_id;
  END IF;

  FOREACH _t IN ARRAY _targets LOOP
    -- Table must exist.
    IF to_regclass(format('public.%I', _t)) IS NULL THEN
      _skipped_tbl := _skipped_tbl || _t;
      RAISE NOTICE 'SKIP (no table): %', _t;
      CONTINUE;
    END IF;

    -- tenant_id column must exist (else it is an absent-column schema gap; a
    -- separate ADD COLUMN migration must handle it — flagged, not filled).
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = _t AND column_name = 'tenant_id'
    ) THEN
      _skipped_col := _skipped_col || _t;
      RAISE NOTICE 'SKIP (no tenant_id column): %', _t;
      CONTINUE;
    END IF;

    -- Backfill ONLY NULL rows -> nycmaid. Non-NULL rows are untouched.
    EXECUTE format(
      'UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', _t, nycmaid_id
    );
    GET DIAGNOSTICS _rows = ROW_COUNT;
    IF _rows > 0 THEN
      _filled := _filled || format('%s(%s)', _t, _rows);
      _total_filled := _total_filled + _rows;
      RAISE NOTICE 'FILLED %: % NULL rows -> nycmaid', _t, _rows;
    END IF;
  END LOOP;

  RAISE NOTICE '---------------------------------------------------------------';
  RAISE NOTICE 'null-tenant backfill complete.';
  RAISE NOTICE '  rows filled (total):   %', _total_filled;
  RAISE NOTICE '  tables filled:         %', COALESCE(array_to_string(_filled, ', '), '(none — all targets already 0-NULL)');
  RAISE NOTICE '  skipped (no table):    %', COALESCE(array_to_string(_skipped_tbl, ', '), '(none)');
  RAISE NOTICE '  skipped (no column):   %', COALESCE(array_to_string(_skipped_col, ', '), '(none)');
  RAISE NOTICE 'NOTE: skipped-no-column tables are schema gaps — an ADD COLUMN';
  RAISE NOTICE '      migration must handle them before RLS targets them.';
  RAISE NOTICE '---------------------------------------------------------------';
END
$backfill$;

-- Review the NOTICEs above. If they are as expected, COMMIT. Otherwise ROLLBACK.
-- (Left explicit so the operator makes the call.)
COMMIT;

-- =====================================================================
-- OPTIONAL — durable lock for the one genuinely-nullable tenant-scoped target.
-- =====================================================================
-- client_referral_stats is the ONLY flagged tenant-scoped table whose
-- tenant_id column is declared NULLABLE in migrations (all others are already
-- NOT NULL). After the backfill above clears its NULLs, this makes the
-- 0-NULL guarantee durable so new NULLs can't reappear. Uncomment to apply.
-- Safe only AFTER the backfill has run and the verify query shows 0 NULLs.
--
-- ALTER TABLE public.client_referral_stats ALTER COLUMN tenant_id SET NOT NULL;
--
-- (Intentionally NOT applied to system_state / prospects — their NULLs are
--  semantically valid; see the EXCLUDED note in the header.)
