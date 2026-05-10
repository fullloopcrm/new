-- Phase 3.2 — Add tenant_id to all tenant-scoped tables.
--
-- 57 tables in scope. 3 explicitly EXCLUDED as global:
--   - travel_time_cache  (geographic, shareable across tenants)
--   - system_state       (platform-level flags)
--   - verification_codes (short-lived auth tokens)
--
-- Pattern per table (idempotent — safe to re-run):
--   1. ADD COLUMN tenant_id uuid (nullable for now)
--   2. UPDATE rows WHERE tenant_id IS NULL → nycmaid id
--   3. ALTER COLUMN ... SET NOT NULL
--   4. ALTER COLUMN ... SET DEFAULT nycmaid id  (rollout safety net,
--      removed once subdomain routing is live in v2)
--   5. ADD foreign key to tenants(id) ON DELETE RESTRICT
--   6. CREATE INDEX on (tenant_id)
--
-- nycmaid id is the well-known UUID '00000000-0000-0000-0000-000000000001'
-- (verified 2026-05-09 against existing tenants row).
--
-- Estimated runtime: <60s on prod. Largest tables: lead_clicks (~23k),
-- sms_conversation_messages (~mid-thousands), the rest are small.
--
-- ROLLBACK: see bottom of file for DROP COLUMN script. Backfill is
-- recoverable today (every row is nycmaid's, the only tenant).
--
-- VERIFICATION (run before/after):
--   SELECT relname, n_live_tup FROM pg_stat_user_tables
--   WHERE relname IN (...the list...) ORDER BY relname;
-- Row counts must match before and after.

DO $$
DECLARE
  nycmaid_id constant uuid := '00000000-0000-0000-0000-000000000001';
  tbl text;
  scoped_tables text[] := ARRAY[
    -- Core ops
    'bookings', 'booking_cleaners', 'booking_notes',
    'clients', 'client_contacts', 'client_reviews', 'client_sms_messages',
    'cleaners', 'cleaner_applications', 'cleaner_payouts',
    'recurring_schedules',
    'schedule_issues',

    -- Payments / finance
    'payments', 'unmatched_payments',
    'expenses', 'bank_statements',

    -- Messaging / agent
    'sms_conversations', 'sms_conversation_messages', 'sms_logs',
    'yinez_memory', 'yinez_skills', 'selena_memory',
    'email_logs', 'outreach_log',

    -- Comhub (per-tenant ops/voice)
    'comhub_active_calls', 'comhub_admin_phones', 'comhub_admin_presence',
    'comhub_admin_voice_settings', 'comhub_channel_members', 'comhub_contacts',
    'comhub_mentions', 'comhub_messages', 'comhub_missed_call_sms',
    'comhub_softphone_calls', 'comhub_templates', 'comhub_threads',

    -- Marketing / sales pipeline
    'leads_dummy_placeholder',  -- kept slot for clarity; replaced below
    'lead_clicks',
    'deals', 'deal_activities',
    'campaigns', 'campaign_recipients',
    'marketing_opt_out_log',
    'referrers', 'referral_commissions', 'blocked_referrers',
    'reviews', 'google_reviews', 'ratings',
    'management_applications', 'management_application_drafts',

    -- Settings / system per-tenant
    'settings',
    'notifications', 'push_subscriptions',
    'admin_tasks',
    'domain_notes',
    'error_logs'
  ];
BEGIN
  -- Drop the placeholder slot
  scoped_tables := array_remove(scoped_tables, 'leads_dummy_placeholder');

  FOREACH tbl IN ARRAY scoped_tables LOOP
    -- Skip if the table doesn't exist (defensive — some older envs may differ)
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'SKIP: % does not exist', tbl;
      CONTINUE;
    END IF;

    -- 1. Add column (nullable initially)
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid', tbl);

    -- 2. Backfill any NULL rows to nycmaid
    EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', tbl, nycmaid_id);

    -- 3. Lock down: NOT NULL
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', tbl);

    -- 4. Default to nycmaid (rollout safety net — REMOVE in v2 when
    --    subdomain routing supplies the correct tenant per request)
    EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT %L', tbl, nycmaid_id);

    -- 5. Foreign key (skip if already exists)
    BEGIN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT',
        tbl, tbl || '_tenant_fk'
      );
    EXCEPTION
      WHEN duplicate_object THEN NULL;
      WHEN invalid_foreign_key THEN
        RAISE NOTICE 'FK skipped on % (likely already exists or table referenced differently)', tbl;
    END;

    -- 6. Index for tenant-scoped queries
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)',
      tbl || '_tenant_id_idx', tbl
    );

    RAISE NOTICE '%: tenant_id added + backfilled', tbl;
  END LOOP;
END $$;

-- ── Pre-flight verification (run BEFORE applying) ────────────────────────
-- Snapshot row counts for the heavy tables — they MUST match after.
--
-- SELECT 'bookings' AS t, COUNT(*) FROM bookings
-- UNION ALL SELECT 'clients', COUNT(*) FROM clients
-- UNION ALL SELECT 'cleaners', COUNT(*) FROM cleaners
-- UNION ALL SELECT 'payments', COUNT(*) FROM payments
-- UNION ALL SELECT 'sms_conversation_messages', COUNT(*) FROM sms_conversation_messages
-- UNION ALL SELECT 'lead_clicks', COUNT(*) FROM lead_clicks
-- UNION ALL SELECT 'yinez_memory', COUNT(*) FROM yinez_memory;

-- ── Post-apply verification ─────────────────────────────────────────────
-- 1. Every targeted table now has tenant_id with zero NULLs:
--
-- SELECT t.table_name,
--        (SELECT COUNT(*) FROM information_schema.columns c
--           WHERE c.table_schema = 'public' AND c.table_name = t.table_name
--             AND c.column_name = 'tenant_id') AS has_col
--   FROM information_schema.tables t
--  WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
--  ORDER BY has_col, t.table_name;
--
-- 2. Spot-check a row of each:
--
-- SELECT 'bookings' AS t, tenant_id, COUNT(*) FROM bookings GROUP BY tenant_id
-- UNION ALL SELECT 'clients', tenant_id, COUNT(*) FROM clients GROUP BY tenant_id
-- ... etc;

-- ── Rollback script (paste into SQL editor if needed) ────────────────────
--
-- DO $$
-- DECLARE tbl text;
-- BEGIN
--   FOREACH tbl IN ARRAY ARRAY[
--     'bookings','booking_cleaners','booking_notes','clients','client_contacts',
--     'client_reviews','client_sms_messages','cleaners','cleaner_applications',
--     'cleaner_payouts','recurring_schedules','schedule_issues','payments',
--     'unmatched_payments','expenses','bank_statements','sms_conversations',
--     'sms_conversation_messages','sms_logs','yinez_memory','yinez_skills',
--     'selena_memory','email_logs','outreach_log','comhub_active_calls',
--     'comhub_admin_phones','comhub_admin_presence','comhub_admin_voice_settings',
--     'comhub_channel_members','comhub_contacts','comhub_mentions','comhub_messages',
--     'comhub_missed_call_sms','comhub_softphone_calls','comhub_templates',
--     'comhub_threads','lead_clicks','deals','deal_activities','campaigns',
--     'campaign_recipients','marketing_opt_out_log','referrers',
--     'referral_commissions','blocked_referrers','reviews','google_reviews',
--     'ratings','management_applications','management_application_drafts',
--     'settings','notifications','push_subscriptions','admin_tasks',
--     'domain_notes','error_logs'
--   ] LOOP
--     EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS tenant_id CASCADE', tbl);
--   END LOOP;
-- END $$;
