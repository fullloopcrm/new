-- =====================================================================
-- RLS POST-ENABLEMENT VERIFICATION — relrowsecurity + pg_policies per gap table
-- =====================================================================
-- Author: worker W5, branch p1-w5, 2026-07-12.
-- READ-ONLY. Pure SELECTs against pg_catalog / information_schema. Safe to run
-- against ANY database at any time (before or after enablement).
--
-- RELATIONSHIP TO deploy-prep/rls-gap-closure-verify.sql (read this):
--   That companion file is TIGHTLY COUPLED to rls-gap-closure.sql — it asserts
--   the specific `tenant_isolation` policy exists on each of the 58 targets and
--   pass/fails against that exact shape.
--   THIS file is deliberately POLICY-NAME-AGNOSTIC and broader. It answers
--   "what is the live RLS + policy state?" whatever was applied, and adds a
--   whole-surface drift sweep (every tenant_id table, not just the 58). Use it:
--     - after ANY RLS enablement step (gap-closure, deny-stubs, ad-hoc), and
--     - to detect list drift (tables that should be in the 58 but aren't, or
--       got RLS out-of-band).
--   The two are complementary; run both after a gap-closure apply.
--
-- Source of the 58 gap set: deploy-prep/rls-coverage-audit.md.
-- =====================================================================

\echo '========================================================================'
\echo ' RLS POST-ENABLEMENT VERIFICATION'
\echo '========================================================================'

-- The 58 gap tables (deploy-prep/rls-coverage-audit.md "GAP — no RLS"), reused
-- across queries below. Keep in sync with rls-gap-closure.sql _targets array.
-- (psql has no session-scoped list, so the VALUES block is repeated per query.)

\echo ''
\echo '== Query 1: relrowsecurity + policy summary PER GAP TABLE =='
\echo '   expect (post gap-closure apply): 58 rows, rls_enabled = t, policy_count >= 1.'
\echo '   force_rls is informational — service_role bypasses RLS regardless (see Q5).'
WITH gap(table_name) AS (
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
SELECT g.table_name,
       to_regclass(format('public.%I', g.table_name)) IS NOT NULL AS table_exists,
       c.relrowsecurity                                  AS rls_enabled,
       c.relforcerowsecurity                             AS force_rls,
       count(p.polname)                                  AS policy_count,
       COALESCE(
         array_agg(p.polname ORDER BY p.polname) FILTER (WHERE p.polname IS NOT NULL),
         '{}'
       )                                                 AS policy_names
FROM gap g
LEFT JOIN pg_class     c ON c.oid = to_regclass(format('public.%I', g.table_name))
LEFT JOIN pg_policy    p ON p.polrelid = c.oid
GROUP BY g.table_name, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relrowsecurity NULLS FIRST, count(p.polname), g.table_name;

\echo ''
\echo '== Query 2: FULL pg_policies DUMP for the gap tables (inspect the applied shape) =='
\echo '   eyeball cmd / roles / permissive / qual / with_check against the intended policy.'
WITH gap(table_name) AS (
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
SELECT pol.tablename,
       pol.policyname,
       pol.permissive,
       pol.cmd,
       pol.roles,
       pol.qual,
       pol.with_check
FROM pg_policies pol
JOIN gap g ON g.table_name = pol.tablename
WHERE pol.schemaname = 'public'
ORDER BY pol.tablename, pol.policyname;

\echo ''
\echo '== Query 3: FAILURES — gap tables with RLS off, missing, or ZERO policies (expect 0 rows) =='
\echo '   policy-name-agnostic: flags any target lacking RLS or any policy at all.'
WITH gap(table_name) AS (
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
SELECT g.table_name,
       CASE
         WHEN to_regclass(format('public.%I', g.table_name)) IS NULL THEN 'table missing'
         WHEN NOT COALESCE(c.relrowsecurity, FALSE)                  THEN 'RLS off'
         WHEN count(p.polname) = 0                                   THEN 'no policies at all'
       END AS problem
FROM gap g
LEFT JOIN pg_class  c ON c.oid = to_regclass(format('public.%I', g.table_name))
LEFT JOIN pg_policy p ON p.polrelid = c.oid
GROUP BY g.table_name, c.relrowsecurity
HAVING to_regclass(format('public.%I', g.table_name)) IS NULL
    OR NOT COALESCE(c.relrowsecurity, FALSE)
    OR count(p.polname) = 0
ORDER BY g.table_name;

\echo ''
\echo '== Query 4: WHOLE-SURFACE DRIFT SWEEP — every tenant_id table, RLS state + policy count =='
\echo '   catches drift the 58-list misses: a tenant table with RLS still OFF, or one enabled'
\echo '   out-of-band. Cross-check against deploy-prep/rls-coverage-audit.md (132 tenant tables).'
SELECT c.relname                              AS table_name,
       c.relrowsecurity                       AS rls_enabled,
       c.relforcerowsecurity                  AS force_rls,
       count(p.polname)                        AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
JOIN pg_attribute a ON a.attrelid = c.oid
                   AND a.attname = 'tenant_id'
                   AND a.attnum > 0
                   AND NOT a.attisdropped
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relkind = 'r'
GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
ORDER BY c.relrowsecurity, count(p.polname), c.relname;

\echo ''
\echo '== Query 5: INERTNESS REMINDER (MANUAL — not automated) =='
\echo 'These policies are DEFENSE-IN-DEPTH staged ahead of the scoped-client cutover.'
\echo 'service_role BYPASSES RLS, so as service_role a plain `SELECT count(*) FROM clients;`'
\echo 'must STILL return all rows after enablement. If it returns 0 or errors, something'
\echo 'other than these policies changed — investigate. See HARD PRECONDITION (2) in'
\echo 'deploy-prep/rls-gap-closure.sql.'
