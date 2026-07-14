-- 2026_07_11_rls_tenant_tables.sql
-- P2 — RLS tenant_isolation across every tenant-scoped table.
--
-- WHAT THIS DOES
--   For every table that carries a `tenant_id` column, this migration:
--     1. ENABLE ROW LEVEL SECURITY  (idempotent no-op if already on)
--     2. (re)creates one permissive policy `tenant_isolation` FOR ALL:
--            USING      ( jwt.tenant_id = tenant_id::text )
--            WITH CHECK ( jwt.tenant_id = tenant_id::text )
--        where jwt.tenant_id = current_setting('request.jwt.claims',true)::jsonb->>'tenant_id'.
--   A row is visible / writable only when the caller's JWT tenant_id matches the
--   row's tenant_id. This is the same expression already shipped by
--   039_atomic_ledger_and_hardening.sql and 2026_07_11_enable_rls_gap_tables.sql.
--
-- WHY IT IS SAFE TO APPLY (defense-in-depth, not a behavior change today)
--   The platform runs EVERY query through the service-role client
--   (`supabaseAdmin`), and service_role BYPASSES RLS. Verified in this worktree:
--   no anon/authenticated Supabase client makes any `.from('<table>')` table
--   call — the anon key is used only for Storage uploads (`supabase.storage
--   .from('uploads')`) and signed-URL requests routed through service-role API
--   handlers (/api/apply, /api/apply/signed-url, /api/apply-ceo). So enabling
--   RLS + tenant_isolation changes nothing for current code paths. It is a
--   safety net: if any route ever migrates to an authenticated-JWT client,
--   these policies stop cross-tenant reads/writes at the database.
--   (Leader already verified the same pattern on the 15 gap tables 2026-07-11:
--   tenant sites still 200 after apply.)
--
-- IMPORTANT: the LIVE isolation gate remains app-layer `.eq('tenant_id', …)`
--   (audit-tenant-scope.mjs backstop), because service_role bypasses these
--   policies. This migration does NOT replace that — it backstops it.
--
-- IDEMPOTENT: ENABLE RLS is a no-op when already on; DROP POLICY IF EXISTS
--   precedes every CREATE POLICY. Safe to re-run. Each table is guarded by a
--   to_regclass() existence check AND an information_schema tenant_id-column
--   check, so a stale table name in the list is skipped (RAISE NOTICE), never
--   an error.
--
-- DO NOT RUN from this worktree. Leader applies on prod after Jeff approves.
-- Rollback: DROP POLICY tenant_isolation ON public.<t>;  (and optionally
--           ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;)
--
-- ── SOURCE OF TRUTH ─────────────────────────────────────────────────────────
--   scripts/audit-tenant-scope.mjs → TENANT_TABLES (auto-derived: every table
--   in the live DB that carries a tenant_id column). 135 tables — this already
--   includes the migration-008 trio (cleaner_broadcasts,
--   cleaner_broadcast_recipients, google_posts) via the companion change noted
--   below. This migration covers all of them EXCEPT the 3 deny-all exclusions
--   below (→132), and ADDS the 3 platform tables that already carry
--   tenant_isolation (to give them WITH CHECK) but are not themselves in
--   TENANT_TABLES. 132 + 3 = 135 tables getting tenant_isolation.
--
-- ── TABLES GETTING `tenant_isolation` (135) ─────────────────────────────────
--   accounting_periods, admin_tasks, ai_usage, audit_log, audit_logs,
--   bank_accounts, bank_import_batches, bank_statements, bank_transactions,
--   blocked_referrers, booking_notes, booking_team_members, bookings,
--   campaign_recipients, campaigns, categorization_patterns, chart_of_accounts,
--   cleaner_applications, client_contacts, client_properties,
--   client_referral_stats, client_reviews, client_sms_messages, clients,
--   comhub_active_calls, comhub_admin_phones, comhub_admin_presence,
--   comhub_admin_voice_settings, comhub_channel_members, comhub_contacts,
--   comhub_mentions, comhub_messages, comhub_missed_call_sms,
--   comhub_softphone_calls, comhub_templates, comhub_threads, connect_channels,
--   connect_messages, connect_read_cursors, cpa_access_tokens, crews,
--   deal_activities, deals, document_activity, document_fields, document_signers,
--   documents, domain_notes, domains, email_logs, entities, error_logs, expenses,
--   google_reviews, hr_document_reminders, hr_document_requirements, hr_documents,
--   hr_employee_profiles, hr_notes, import_batches, import_rows, invoice_activity,
--   invoices, jefe_tasks, job_events, job_payments, jobs, journal_entries,
--   journal_lines, lead_clicks, management_application_drafts,
--   management_applications, marketing_opt_out_log, notifications,
--   oauth_state_nonces, onboarding_tasks, outreach_log, payments,
--   payroll_payments, platform_announcement_reads, portal_leads, products,
--   projects, property_changes, prospects, push_subscriptions, quote_activity,
--   quote_templates, quotes, ratings, recurring_exceptions, recurring_expenses,
--   recurring_schedules, referral_commissions, referrals, referrers, reviews,
--   routes, sales_applications, schedule_issues, security_events, selena_memory,
--   seo_changes, seo_competitors, seo_issues, seo_properties, seo_serp,
--   service_types, sms_conversation_messages, sms_conversations, sms_logs,
--   system_state, team_applications, team_member_documents, team_member_payouts,
--   team_members, team_notifications, tenant_domains, tenant_invites,
--   tenant_members, tenant_owner_messages, tenant_settings, territory_claims,
--   travel_time_cache, unmatched_payments, waitlist, website_visits,
--   yinez_memory, yinez_skills, resale_assets, tenant_health, year_end_runs,
--   cleaner_broadcasts, cleaner_broadcast_recipients, google_posts
--     (^ these 3 were missing from this comment — the migration-008 trio, see
--     the NOTE a few lines down; they're already in the real `tenant_tables`
--     array below. Header now matches the array: 132 + 3 = 135.)
--
--   NOTE tenant_domains: it currently carries the deny-all policy from
--     046_rls_deny_on_new_tables.sql. That file's own comment sanctions the
--     switch ("Owner might eventually manage these via admin UI — at that point,
--     switch deny-all to a tenant-scoped policy"). This migration DROPS
--     "deny_all_tenant_domains" and replaces it with tenant_isolation.
--   NOTE system_state: tenant_id is NULLABLE (platform-level flag rows carry
--     NULL). Those NULL rows become service-role-only under this policy — the
--     safe posture. Per-tenant rows isolate normally.
--   NOTE resale_assets / tenant_health / year_end_runs: already have
--     tenant_isolation (USING only) from 2026_07_11_enable_rls_gap_tables.sql.
--     Re-emitted here to add the WITH CHECK clause. Idempotent.
--   NOTE cleaner_broadcasts / cleaner_broadcast_recipients / google_posts:
--     migration 008 created these with `tenant_id uuid NOT NULL REFERENCES
--     tenants(id)` and ran `ENABLE ROW LEVEL SECURITY` but NEVER created a
--     policy — so today they are RLS-on + no-policy = deny-all to any non
--     service-role caller. They are also MISSING from audit-tenant-scope.mjs's
--     TENANT_TABLES list (that list is stale for these three). This migration
--     adds tenant_isolation so they match the other 129 tenant tables. Safe:
--     the to_regclass + tenant_id-column guards skip any that a given DB lacks.
--     DONE (companion change): these three are now in TENANT_TABLES in
--     audit-tenant-scope.mjs so the app-layer .eq('tenant_id') gate covers them.
--
-- ── EXCLUDED — DELIBERATELY KEPT DENY-ALL (do NOT weaken) ────────────────────
--   These carry tenant_id and are in TENANT_TABLES, but 046 gave them a strict
--   deny-all ( USING(false) ) on purpose. Adding a PERMISSIVE tenant_isolation
--   policy would OR with deny-all and let a tenant read its own rows — a
--   regression for auth-secret / audit tables. Left untouched:
--     • verification_codes    — email/SMS login codes (service-role only)
--     • portal_auth_codes     — SMS portal verification codes (service-role only)
--     • impersonation_events  — who-impersonated-whom security audit log
--   If tenant-scoped read of any of these is ever wanted, drop its deny-all
--   first, then add tenant_isolation — a separate, deliberate decision.
-- ────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl     text;
  has_tid boolean;
  -- jwt.tenant_id = row.tenant_id  (identical for USING and WITH CHECK)
  match_expr constant text :=
    '(current_setting(''request.jwt.claims'', true)::jsonb ->> ''tenant_id'') = (tenant_id)::text';
  tenant_tables text[] := ARRAY[
    'accounting_periods','admin_tasks','ai_usage','audit_log','audit_logs',
    'bank_accounts','bank_import_batches','bank_statements','bank_transactions','blocked_referrers',
    'booking_notes','booking_team_members','bookings','campaign_recipients','campaigns',
    'categorization_patterns','chart_of_accounts','cleaner_applications','client_contacts','client_properties',
    'client_referral_stats','client_reviews','client_sms_messages','clients','comhub_active_calls',
    'comhub_admin_phones','comhub_admin_presence','comhub_admin_voice_settings','comhub_channel_members','comhub_contacts',
    'comhub_mentions','comhub_messages','comhub_missed_call_sms','comhub_softphone_calls','comhub_templates',
    'comhub_threads','connect_channels','connect_messages','connect_read_cursors','cpa_access_tokens',
    'crews','deal_activities','deals','document_activity','document_fields',
    'document_signers','documents','domain_notes','domains','email_logs',
    'entities','error_logs','expenses','google_reviews','hr_document_reminders',
    'hr_document_requirements','hr_documents','hr_employee_profiles','hr_notes','import_batches',
    'import_rows','invoice_activity','invoices','jefe_tasks','job_events',
    'job_payments','jobs','journal_entries','journal_lines','lead_clicks',
    'management_application_drafts','management_applications','marketing_opt_out_log','notifications','oauth_state_nonces',
    'onboarding_tasks','outreach_log','payments','payroll_payments','platform_announcement_reads',
    'portal_leads','products','projects','property_changes','prospects',
    'push_subscriptions','quote_activity','quote_templates','quotes','ratings',
    'recurring_exceptions','recurring_expenses','recurring_schedules','referral_commissions','referrals',
    'referrers','reviews','routes','sales_applications','schedule_issues',
    'security_events','selena_memory','seo_changes','seo_competitors','seo_issues',
    'seo_properties','seo_serp','service_types','sms_conversation_messages','sms_conversations',
    'sms_logs','system_state','team_applications','team_member_documents','team_member_payouts',
    'team_members','team_notifications','tenant_domains','tenant_invites','tenant_members',
    'tenant_owner_messages','tenant_settings','territory_claims','travel_time_cache','unmatched_payments',
    'waitlist','website_visits','yinez_memory','yinez_skills','resale_assets',
    'tenant_health','year_end_runs',
    -- Tenant-scoped tables from migration 008 that had RLS ENABLED but NO policy
    -- (RLS-on + no-policy = deny-all today). Absent from audit-tenant-scope.mjs's
    -- TENANT_TABLES list; found via a migration-DDL scan. Each is
    -- `tenant_id uuid NOT NULL REFERENCES tenants(id)`. Guards skip them harmlessly
    -- if not present in the target DB. Adding tenant_isolation makes them
    -- consistent with the other 129 tenant tables.
    'cleaner_broadcasts','cleaner_broadcast_recipients','google_posts'
  ];
BEGIN
  -- tenant_domains: retire the 046 deny-all so the permissive tenant_isolation
  -- below is the effective policy (046 comment sanctions this switch).
  IF to_regclass('public.tenant_domains') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "deny_all_tenant_domains" ON public.tenant_domains';
  END IF;

  FOREACH tbl IN ARRAY tenant_tables LOOP
    -- Guard 1: table must exist.
    IF to_regclass(format('public.%I', tbl)) IS NULL THEN
      RAISE NOTICE 'SKIP (no such table): %', tbl;
      CONTINUE;
    END IF;

    -- Guard 2: table must carry a tenant_id column (defends against list drift).
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = tbl
        AND column_name  = 'tenant_id'
    ) INTO has_tid;
    IF NOT has_tid THEN
      RAISE NOTICE 'SKIP (no tenant_id column): %', tbl;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (%s) WITH CHECK (%s)',
      tbl, match_expr, match_expr
    );
    RAISE NOTICE 'RLS + tenant_isolation applied: %', tbl;
  END LOOP;
END $$;

-- ── VERIFICATION (run AFTER apply) ───────────────────────────────────────────
-- 1. Every targeted table has RLS on + a tenant_isolation policy:
--
--   SELECT c.relname,
--          c.relrowsecurity                                    AS rls_on,
--          (p.polname IS NOT NULL)                             AS has_policy
--     FROM pg_class c
--     JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
--     LEFT JOIN pg_policy p ON p.polrelid = c.oid AND p.polname = 'tenant_isolation'
--    WHERE c.relkind = 'r'
--      AND EXISTS (SELECT 1 FROM information_schema.columns col
--                   WHERE col.table_schema='public' AND col.table_name=c.relname
--                     AND col.column_name='tenant_id')
--    ORDER BY rls_on, has_policy, c.relname;
--   -- Expect rls_on=t, has_policy=t for all rows EXCEPT the 3 deny-all tables
--   -- (verification_codes, portal_auth_codes, impersonation_events).
--
-- 2. Confirm the 3 deny-all tables still deny-all (unchanged):
--
--   SELECT polrelid::regclass AS tbl, polname, pg_get_expr(polqual, polrelid) AS using_expr
--     FROM pg_policy
--    WHERE polrelid::regclass::text IN
--          ('verification_codes','portal_auth_codes','impersonation_events')
--    ORDER BY tbl;
--   -- Expect deny_all_* with using_expr = false.
--
-- 3. Smoke test tenant sites still return 200 (service-role bypass held).
