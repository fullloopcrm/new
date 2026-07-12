-- =====================================================================
-- VERIFY — RLS gap closure (companion to deploy-prep/rls-gap-closure.sql)
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-12. READ-ONLY. Run AFTER applying
-- rls-gap-closure.sql to confirm coverage on the 58 target tables. Safe to run
-- against any DB (pure SELECTs; touches only pg_catalog / information_schema).
--
-- Expected post-apply result:
--   - Query A returns 58 rows, EVERY one rls_enabled = t, policy_count >= 1,
--     and has_tenant_isolation = t. Any row failing those = gap not closed.
--   - Query B returns 0 rows (no target left RLS-off or policy-less).
--   - Query C shows each tenant_isolation policy: cmd = ALL, roles = {authenticated},
--     qual + with_check both = (tenant_id = ((auth.jwt() ->> 'tenant_id'))::uuid).
--   - Query D (inertness proof) is a REMINDER, not automated: as service_role,
--     a plain `SELECT count(*) FROM clients` must still return all rows — RLS is
--     bypassed for service_role. If it doesn't, something other than these
--     policies changed. See HARD PRECONDITION (2) in the migration header.
-- =====================================================================

\echo '== Query A: per-target RLS + policy coverage (expect 58 rows, all t / >=1 / t) =='
WITH targets(table_name) AS (
  VALUES
    ('clients'),('bookings'),('invoices'),('bank_accounts'),('bank_transactions'),
    ('documents'),('sms_conversations'),('sms_conversation_messages'),
    ('invoice_activity'),('quotes'),('quote_activity'),('quote_templates'),
    ('journal_entries'),('journal_lines'),('chart_of_accounts'),('accounting_periods'),
    ('entities'),('bank_import_batches'),('categorization_patterns'),
    ('recurring_expenses'),('products'),('cpa_access_tokens'),
    ('document_signers'),('document_fields'),('document_activity'),
    ('jobs'),('job_events'),('job_payments'),('projects'),
    ('booking_cleaners'),('booking_notes'),('cleaners'),('cleaner_payouts'),('crews'),
    ('recurring_schedules'),('schedule_issues'),('routes'),('notifications'),
    ('settings'),('tenant_settings'),('tenant_invites'),('member_pin_reset_codes'),
    ('oauth_state_nonces'),
    ('outreach_log'),('yinez_memory'),('yinez_skills'),('team_notifications'),
    ('management_applications'),('management_application_drafts'),
    ('sales_applications'),('team_applications'),('referrers'),
    ('client_referral_stats'),('campaigns'),('reviews'),('google_reviews'),
    ('audit_log'),('error_logs')
)
SELECT t.table_name,
       COALESCE(c.relrowsecurity, FALSE)                         AS rls_enabled,
       COUNT(p.polname)                                          AS policy_count,
       bool_or(p.polname = 'tenant_isolation')                  AS has_tenant_isolation,
       to_regclass(format('public.%I', t.table_name)) IS NOT NULL AS table_exists
FROM targets t
LEFT JOIN pg_class     c ON c.oid = to_regclass(format('public.%I', t.table_name))
LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
LEFT JOIN pg_policy    p ON p.polrelid = c.oid
GROUP BY t.table_name, c.relrowsecurity, c.oid
ORDER BY (COALESCE(c.relrowsecurity, FALSE) AND bool_or(p.polname = 'tenant_isolation')),
         t.table_name;

\echo ''
\echo '== Query B: FAILURES — targets still missing RLS or the tenant_isolation policy (expect 0 rows) =='
WITH targets(table_name) AS (
  VALUES
    ('clients'),('bookings'),('invoices'),('bank_accounts'),('bank_transactions'),
    ('documents'),('sms_conversations'),('sms_conversation_messages'),
    ('invoice_activity'),('quotes'),('quote_activity'),('quote_templates'),
    ('journal_entries'),('journal_lines'),('chart_of_accounts'),('accounting_periods'),
    ('entities'),('bank_import_batches'),('categorization_patterns'),
    ('recurring_expenses'),('products'),('cpa_access_tokens'),
    ('document_signers'),('document_fields'),('document_activity'),
    ('jobs'),('job_events'),('job_payments'),('projects'),
    ('booking_cleaners'),('booking_notes'),('cleaners'),('cleaner_payouts'),('crews'),
    ('recurring_schedules'),('schedule_issues'),('routes'),('notifications'),
    ('settings'),('tenant_settings'),('tenant_invites'),('member_pin_reset_codes'),
    ('oauth_state_nonces'),
    ('outreach_log'),('yinez_memory'),('yinez_skills'),('team_notifications'),
    ('management_applications'),('management_application_drafts'),
    ('sales_applications'),('team_applications'),('referrers'),
    ('client_referral_stats'),('campaigns'),('reviews'),('google_reviews'),
    ('audit_log'),('error_logs')
)
SELECT t.table_name,
       CASE
         WHEN to_regclass(format('public.%I', t.table_name)) IS NULL THEN 'table missing'
         WHEN NOT COALESCE(c.relrowsecurity, FALSE)                  THEN 'RLS off'
         WHEN NOT bool_or(p.polname = 'tenant_isolation')            THEN 'no tenant_isolation policy'
       END AS problem
FROM targets t
LEFT JOIN pg_class  c ON c.oid = to_regclass(format('public.%I', t.table_name))
LEFT JOIN pg_policy p ON p.polrelid = c.oid
GROUP BY t.table_name, c.relrowsecurity, c.oid
HAVING to_regclass(format('public.%I', t.table_name)) IS NULL
    OR NOT COALESCE(c.relrowsecurity, FALSE)
    OR NOT bool_or(p.polname = 'tenant_isolation')
ORDER BY t.table_name;

\echo ''
\echo '== Query C: definition of every tenant_isolation policy (inspect cmd/roles/qual/with_check) =='
SELECT tablename,
       policyname,
       cmd,
       roles,
       qual,
       with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'tenant_isolation'
ORDER BY tablename;

\echo ''
\echo '== Query D: inertness reminder (MANUAL) =='
\echo 'As service_role, `SELECT count(*) FROM clients;` must still return ALL rows'
\echo '(RLS is bypassed for service_role). If it returns 0 / errors, investigate —'
\echo 'these policies are meant to be inert until the scoped-client cutover. See'
\echo 'HARD PRECONDITION (2) in deploy-prep/rls-gap-closure.sql.'
