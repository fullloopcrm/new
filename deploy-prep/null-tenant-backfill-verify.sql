-- =====================================================================
-- NULL-TENANT-ID BACKFILL — VERIFY (run BEFORE and AFTER the backfill)
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-12.
-- Companion to deploy-prep/null-tenant-backfill.sql.
--
-- ***  READ-ONLY. Safe to run against prod any time. NOT run by W5.  ***
--
-- Run order:
--   1. BEFORE backfill — Query A shows per-table NULL counts and absent-column
--      gaps. Eyeball it: if any table shows a large NULL count, decide
--      attribution manually before applying the backfill (see the ASSUMPTION
--      note in the backfill file).
--   2. AFTER backfill  — Query B is the PROOF: it must return ZERO rows.
--      Any row returned = a target still has NULL tenant_id => RLS gap-closure
--      is NOT safe to apply yet.
-- =====================================================================

-- ---------------------------------------------------------------------
-- QUERY A — per-target NULL/absent-column census (run BEFORE).
-- One row per flagged tenant-scoped target: does it exist, does it have a
-- tenant_id column, and how many NULL tenant_id rows does it hold.
-- ---------------------------------------------------------------------
WITH targets(table_name) AS (
  VALUES
    ('accounting_periods'),('admin_tasks'),('ai_chat_logs'),('audit_log'),
    ('audit_logs'),('bank_accounts'),('bank_import_batches'),('bank_statements'),
    ('bank_transactions'),('blocked_referrers'),('booking_cleaners'),('booking_notes'),
    ('booking_team_members'),('bookings'),('campaign_recipients'),('campaigns'),
    ('categorization_patterns'),('chart_of_accounts'),('cleaner_applications'),('cleaner_broadcast_recipients'),
    ('cleaner_broadcasts'),('cleaner_payouts'),('cleaners'),('client_contacts'),
    ('client_referral_stats'),('client_reviews'),('client_sms_messages'),('clients'),
    ('comhub_active_calls'),('comhub_admin_phones'),('comhub_admin_presence'),('comhub_admin_voice_settings'),
    ('comhub_channel_members'),('comhub_contacts'),('comhub_mentions'),('comhub_messages'),
    ('comhub_missed_call_sms'),('comhub_softphone_calls'),('comhub_templates'),('comhub_threads'),
    ('connect_channels'),('connect_messages'),('connect_read_cursors'),('cpa_access_tokens'),
    ('crews'),('deal_activities'),('deals'),('document_activity'),
    ('document_fields'),('document_signers'),('documents'),('domain_notes'),
    ('email_logs'),('entities'),('error_logs'),('expenses'),
    ('google_posts'),('google_reviews'),('hr_document_reminders'),('hr_document_requirements'),
    ('hr_documents'),('hr_employee_profiles'),('hr_notes'),('import_batches'),
    ('import_rows'),('invoice_activity'),('invoices'),('job_events'),
    ('job_payments'),('jobs'),('journal_entries'),('journal_lines'),
    ('lead_clicks'),('management_application_drafts'),('management_applications'),('marketing_opt_out_log'),
    ('member_pin_reset_codes'),('notifications'),('oauth_state_nonces'),('outreach_log'),
    ('payments'),('payroll_payments'),('platform_announcement_reads'),('portal_leads'),
    ('products'),('projects'),('push_subscriptions'),('quote_activity'),
    ('quote_templates'),('quotes'),('ratings'),('recurring_expenses'),
    ('recurring_schedules'),('referral_commissions'),('referrers'),('reviews'),
    ('routes'),('sales_applications'),('schedule_issues'),('security_events'),
    ('selena_memory'),('settings'),('sms_conversation_messages'),('sms_conversations'),
    ('sms_logs'),('team_applications'),('team_member_payouts'),('team_notifications'),
    ('tenant_invites'),('tenant_settings'),('travel_time_cache'),('unmatched_payments'),
    ('waitlist'),('website_visits'),('yinez_memory'),('yinez_skills')
)
SELECT
  t.table_name,
  (to_regclass('public.' || quote_ident(t.table_name)) IS NOT NULL) AS table_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = t.table_name
      AND c.column_name = 'tenant_id'
  )                                                                  AS has_tenant_id_col
FROM targets t
ORDER BY has_tenant_id_col, table_exists, t.table_name;
-- Query A confirms only existence + tenant_id-column presence (a plain static
-- SQL query cannot count NULLs across arbitrary tables). For the actual
-- per-table NULL COUNTS run Query A-EXEC below; Query B is the pass/fail proof
-- that gates the backfill.

-- ---------------------------------------------------------------------
-- QUERY A-EXEC — per-table NULL counts via a loop (RAISE NOTICE each).
-- Read-only (SELECT count only). Run BEFORE to eyeball magnitudes.
-- ---------------------------------------------------------------------
DO $census$
DECLARE
  _targets text[] := ARRAY[
    'accounting_periods','admin_tasks','ai_chat_logs','audit_log','audit_logs',
    'bank_accounts','bank_import_batches','bank_statements','bank_transactions',
    'blocked_referrers','booking_cleaners','booking_notes','booking_team_members',
    'bookings','campaign_recipients','campaigns','categorization_patterns',
    'chart_of_accounts','cleaner_applications','cleaner_broadcast_recipients',
    'cleaner_broadcasts','cleaner_payouts','cleaners','client_contacts',
    'client_referral_stats','client_reviews','client_sms_messages','clients',
    'comhub_active_calls','comhub_admin_phones','comhub_admin_presence',
    'comhub_admin_voice_settings','comhub_channel_members','comhub_contacts',
    'comhub_mentions','comhub_messages','comhub_missed_call_sms',
    'comhub_softphone_calls','comhub_templates','comhub_threads','connect_channels',
    'connect_messages','connect_read_cursors','cpa_access_tokens','crews',
    'deal_activities','deals','document_activity','document_fields',
    'document_signers','documents','domain_notes','email_logs','entities',
    'error_logs','expenses','google_posts','google_reviews','hr_document_reminders',
    'hr_document_requirements','hr_documents','hr_employee_profiles','hr_notes',
    'import_batches','import_rows','invoice_activity','invoices','job_events',
    'job_payments','jobs','journal_entries','journal_lines','lead_clicks',
    'management_application_drafts','management_applications','marketing_opt_out_log',
    'member_pin_reset_codes','notifications','oauth_state_nonces','outreach_log',
    'payments','payroll_payments','platform_announcement_reads','portal_leads',
    'products','projects','push_subscriptions','quote_activity','quote_templates',
    'quotes','ratings','recurring_expenses','recurring_schedules',
    'referral_commissions','referrers','reviews','routes','sales_applications',
    'schedule_issues','security_events','selena_memory','settings',
    'sms_conversation_messages','sms_conversations','sms_logs','team_applications',
    'team_member_payouts','team_notifications','tenant_invites','tenant_settings',
    'travel_time_cache','unmatched_payments','waitlist','website_visits',
    'yinez_memory','yinez_skills'
  ];
  _t text;
  _n bigint;
  _grand bigint := 0;
BEGIN
  FOREACH _t IN ARRAY _targets LOOP
    IF to_regclass(format('public.%I', _t)) IS NULL THEN
      RAISE NOTICE '% : (no table)', _t; CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=_t AND column_name='tenant_id'
    ) THEN
      RAISE NOTICE '% : (no tenant_id column)', _t; CONTINUE;
    END IF;
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t) INTO _n;
    IF _n > 0 THEN
      RAISE NOTICE '% : % NULL tenant_id', _t, _n;
      _grand := _grand + _n;
    END IF;
  END LOOP;
  RAISE NOTICE '=== total NULL tenant_id across 116 targets: % ===', _grand;
END
$census$;

-- ---------------------------------------------------------------------
-- QUERY B — THE PROOF (run AFTER backfill). Must return ZERO rows.
-- Any row = a tenant-scoped target still carries NULL tenant_id.
-- Uses the live catalog directly so it also catches tables not in the list.
-- ---------------------------------------------------------------------
DO $proof$
DECLARE
  _t text;
  _n bigint;
  _bad text[] := ARRAY[]::text[];
BEGIN
  FOR _t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'tenant_id' AND a.attnum > 0 AND NOT a.attisdropped
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      -- exclude the two intentionally-nullable, non-tenant-scoping columns
      AND c.relname NOT IN ('system_state','prospects')
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', _t) INTO _n;
    IF _n > 0 THEN
      _bad := _bad || format('%s(%s)', _t, _n);
    END IF;
  END LOOP;

  IF array_length(_bad, 1) > 0 THEN
    RAISE EXCEPTION E'FAIL: NULL tenant_id remains — RLS gap-closure NOT safe.\n  %',
      array_to_string(_bad, ', ');
  ELSE
    RAISE NOTICE 'PASS: 0 NULL tenant_id across all tenant-scoped tables (excl. system_state, prospects). RLS precondition satisfied.';
  END IF;
END
$proof$;
