-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 11:39:
-- "continue backlog 3-deep: RLS-gap policy proposals."
--
-- Source: W5's rls-coverage-audit.md (p1-w5) found 58 tenant_id tables with
-- ENABLE ROW LEVEL SECURITY never set in any migration. Passes 1-3 covered
-- 30 of the 58 (clients/bookings/sms/invoices/bank/documents; quotes/journal/
-- bank_import/cpa_tokens/tenant_settings/entities/job_payments/audit_log;
-- booking_notes/crews/routes/notifications/oauth_nonces/tenant_invites/
-- chart_of_accounts/categorization_patterns/recurring_expenses/
-- accounting_periods). This is PASS 4 (10 of the remaining 28): sales/hiring
-- applications (management_applications, management_application_drafts,
-- sales_applications, team_applications), marketing/growth (campaigns,
-- referrers, google_reviews, reviews, outreach_log), and core ops (jobs).
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX — same caveat as passes 1-3: every
-- API route reads/writes via `supabaseAdmin` (service_role), which BYPASSES
-- RLS UNCONDITIONALLY. This migration is provably inert on today's request
-- paths; it only matters for a future request-scoped (JWT) client
-- (tenant-isolation-rls-plan.md Stage 2/3) or as a backstop against a
-- misconfigured service_role / raw `pg` connection.
--
-- Policy shape: identical to passes 1-3 — matches the one already-deployed
-- policy (onboarding_tasks) and 2026_07_11_enable_rls_gap_tables.sql, reading
-- `current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'` as
-- text. Same open auth.jwt() vs current_setting question as before — still
-- unresolved, still equally inert either way today.
--
-- Stage-0 prerequisite (tenant_id UUID NOT NULL + an existing index covering
-- tenant_id) verified per table against its CREATE TABLE / CREATE INDEX
-- statements, not assumed:
--   management_applications       → src/lib/migrations/018_management_applications.sql (idx_mgmt_apps_tenant_status, idx_mgmt_apps_email)
--   management_application_drafts → src/lib/migrations/018_management_applications.sql (UNIQUE (tenant_id, ip_address, position) — leading column tenant_id)
--   sales_applications             → src/lib/migrations/2026_07_02_sales_applications.sql (idx_sales_applications_tenant_status)
--   team_applications              → src/lib/migrations/007_missing_tables.sql (idx_team_applications_tenant)
--   campaigns                      → supabase/schema.sql (idx_campaigns_tenant)
--   referrers                      → src/lib/migrations/019_referral_commissions.sql (idx_referrers_tenant_status)
--   google_reviews                 → src/lib/migrations/006_error_resilience.sql (idx_google_reviews_tenant)
--   reviews                        → supabase/schema.sql (idx_reviews_tenant)
--   outreach_log                   → src/lib/migrations/016_outreach_log.sql (UNIQUE (tenant_id, client_id, moment_id) + idx_outreach_log_tenant_moment — leading column tenant_id)
--   jobs                           → src/lib/migrations/2026_07_02_jobs_projects.sql (idx_jobs_tenant_status)
--
-- EXCLUDED from this pass, with reasons (flagging for Jeff/leader rather
-- than silently omitting):
--   - `client_referral_stats` (src/lib/migrations/010_nycmaid_parity_columns_2.sql
--     line 22): `tenant_id uuid` is NOT `NOT NULL` — fails the Stage-0
--     prerequisite outright. A tenant-scoped policy on a nullable FK would
--     silently hide any row with a null tenant_id from every tenant AND from
--     the (future) scoped client. Needs a backfill + NOT NULL constraint
--     first, out of scope for this pass.
--   - `error_logs` (src/lib/migrations/006_error_resilience.sql): `tenant_id
--     uuid REFERENCES tenants(id) ON DELETE SET NULL` — explicitly nullable
--     (platform-wide errors with no tenant context are a real, intended
--     case for this table). Same Stage-0 failure as client_referral_stats;
--     a tenant policy here would need `tenant_id IS NULL OR tenant_id = ...`
--     to avoid hiding platform-level errors, which is a different policy
--     shape than the rest of this series. Deferred, needs its own design.
--   - `job_events` (src/lib/migrations/2026_07_02_jobs_projects.sql):
--     `tenant_id UUID NOT NULL` but its only index (`idx_job_events_job`)
--     covers `job_id`, not `tenant_id` — same Stage-0 index failure mode as
--     pass-2's `document_fields` and pass-3's `document_activity`. Needs
--     `CREATE INDEX ... ON job_events(tenant_id)` first.
--   - `team_notifications` (src/lib/migrations/007_missing_tables.sql):
--     `tenant_id uuid NOT NULL` but its only index
--     (`idx_team_notifications_member`) covers `team_member_id`, not
--     `tenant_id` — same index failure mode as job_events above.
--   - `projects`: referenced throughout app code but has **no `CREATE
--     TABLE`** for that exact name anywhere in migrations/,
--     src/lib/migrations/, or supabase/ — same "exists in prod via ad-hoc
--     SQL" situation flagged for booking_cleaners/cleaners/cleaner_payouts/
--     member_pin_reset_codes in pass 3. Needs a live `\d projects` to confirm
--     schema before it can get a policy.
--   - Remaining ~11 gap tables (products, quote_templates,
--     recurring_schedules, schedule_issues, yinez_memory, yinez_skills, plus
--     the 5 above) are lower-sensitivity or already deferred pending the
--     schema/index questions above — see rls-coverage-audit.md in
--     p1-w5's deploy-prep/ for the full remaining list. The 6 verified-clean
--     ones (products/quote_templates/recurring_schedules/schedule_issues/
--     yinez_memory/yinez_skills) are good candidates for pass 5.
--
-- Same WITH CHECK inclusion as passes 1-3 (FOR ALL, not SELECT-only like
-- onboarding_tasks) — confirm that's wanted before running, same as before.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'management_applications',
    'management_application_drafts',
    'sales_applications',
    'team_applications',
    'campaigns',
    'referrers',
    'google_reviews',
    'reviews',
    'outreach_log',
    'jobs'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);

    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I
         FOR ALL
         USING (
           (current_setting(''request.jwt.claims'', true)::jsonb ->> ''tenant_id'') = (tenant_id)::text
         )
         WITH CHECK (
           (current_setting(''request.jwt.claims'', true)::jsonb ->> ''tenant_id'') = (tenant_id)::text
         )',
      t
    );

    RAISE NOTICE '%: RLS enabled + tenant_isolation policy created', t;
  END LOOP;
END $$;

-- Verification (run after apply, against the sandbox/branch DB first):
--
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
--        COUNT(p.polname) AS policy_count
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- WHERE n.nspname = 'public'
--   AND c.relname IN ('management_applications','management_application_drafts',
--     'sales_applications','team_applications','campaigns','referrers',
--     'google_reviews','reviews','outreach_log','jobs')
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
--
-- Expect rls_enabled = true, policy_count = 1 for all 10.
--
-- Then re-verify service_role is unaffected (the inertness proof): run a
-- normal supabaseAdmin-backed API request that touches each of these 10
-- tables (submit a management/sales/team application, create a campaign,
-- register a referrer, sync a google review, request a review, log
-- outreach, create a job) and confirm 200s exactly as before.

-- Rollback (per table, if needed):
-- ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- -- or, to keep RLS on but remove the tenant policy (falls back to the
-- -- "RLS on, no policy" state already live on 60 other tables):
-- DROP POLICY IF EXISTS tenant_isolation ON public.<table>;
