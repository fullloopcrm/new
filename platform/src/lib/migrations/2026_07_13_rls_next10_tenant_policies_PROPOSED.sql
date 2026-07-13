-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 11:15 part (a):
-- "extend to the next 10 highest-risk no-RLS tables from W5's audit."
--
-- Source: W5's rls-coverage-audit.md (p1-w5) found 58 tenant_id tables with
-- ENABLE ROW LEVEL SECURITY never set in any migration. The first pass
-- (2026_07_13_rls_top10_tenant_policies_PROPOSED.sql) covered the 10 highest:
-- clients, bookings, sms_conversations(+messages), invoices(+activity),
-- bank_accounts/bank_transactions, documents(+signers). This is the NEXT 10:
-- quotes(+activity), the accounting ledger (journal_entries/journal_lines),
-- bank_import_batches (bank_* sibling), cpa_access_tokens (a literal bearer
-- token table), tenant_settings, entities, job_payments, and audit_log.
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX — same caveat as the first pass:
-- every API route reads/writes via `supabaseAdmin` (service_role), which
-- BYPASSES RLS UNCONDITIONALLY. This migration is provably inert on today's
-- request paths; it only matters for a future request-scoped (JWT) client
-- (tenant-isolation-rls-plan.md Stage 2/3) or as a backstop against a
-- misconfigured service_role / raw `pg` connection.
--
-- Policy shape: identical to the first pass — matches the one already-
-- deployed policy (onboarding_tasks) and 2026_07_11_enable_rls_gap_tables.sql,
-- reading `current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'`
-- as text. See that file's header for the auth.jwt() vs current_setting
-- open question — still unresolved, still equally inert either way today.
--
-- Stage-0 prerequisite (tenant_id UUID NOT NULL + an existing index) verified
-- per table against its CREATE TABLE / CREATE INDEX statements, not assumed:
--   quotes, quote_activity        → src/lib/migrations/026_quotes.sql
--   journal_entries, journal_lines,
--   bank_import_batches           → src/lib/migrations/032_ledger.sql
--   cpa_access_tokens             → src/lib/migrations/036_cpa_retry.sql
--   tenant_settings               → src/lib/migrations/007_missing_tables.sql
--   entities                      → src/lib/migrations/034_entities.sql
--   job_payments                  → src/lib/migrations/2026_07_02_jobs_projects.sql
--   audit_log                     → src/lib/migrations/035_close_audit.sql
--
-- EXCLUDED from this pass despite being bold/high-sensitivity in W5's audit,
-- with reasons (flagging for Jeff/leader rather than silently omitting):
--   - `document_fields` (e-sign field values): tenant_id UUID NOT NULL is
--     present, but it has NO index covering tenant_id at all (only
--     idx_document_fields_doc on document_id and idx_document_fields_signer
--     on signer_id — see 031_documents.sql). Fails the Stage-0 prerequisite
--     the plan requires before adding a policy. Needs
--     `CREATE INDEX ... ON document_fields(tenant_id)` first (separate,
--     small migration) before it can join this list.
--   - `settings` (listed as a bare table in W5's audit's gap list/matrix):
--     no `CREATE TABLE settings` (bare name, not tenant_settings or
--     platform_settings) exists in either migrations/ or
--     src/lib/migrations/ — the only hit is a comment in
--     migrations/2026_05_19_remaining_tables.sql noting "settings →
--     tenants table jsonb columns". Code DOES call
--     `.from('settings')` (e.g. src/app/site/nyc-mobile-salon/_lib/settings.ts),
--     so a real table likely exists in prod via ad-hoc SQL that never landed
--     in a migration file — exactly the audit's own stated limitation. I
--     will not author RLS DDL against a schema I cannot verify from source;
--     confirm its actual columns via a live `\d settings` before including it.
--   - `quote_templates`, `entities`'s sibling tables, and the remaining ~36
--     gap tables (jobs/projects, sales/applications, most of core client/ops,
--     messaging logs) are lower-sensitivity or already deferred — see
--     rls-coverage-audit.md in p1-w5's deploy-prep/ for the full remaining list.
--
-- Same WITH CHECK inclusion as the first pass (FOR ALL, not SELECT-only like
-- onboarding_tasks) — confirm that's wanted before running, same as before.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'quotes',
    'quote_activity',
    'journal_entries',
    'journal_lines',
    'bank_import_batches',
    'cpa_access_tokens',
    'tenant_settings',
    'entities',
    'job_payments',
    'audit_log'
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
--   AND c.relname IN ('quotes','quote_activity','journal_entries',
--     'journal_lines','bank_import_batches','cpa_access_tokens',
--     'tenant_settings','entities','job_payments','audit_log')
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
--
-- Expect rls_enabled = true, policy_count = 1 for all 10.
--
-- Then re-verify service_role is unaffected (the inertness proof): run a
-- normal supabaseAdmin-backed API request that touches each of these 10
-- tables (e.g. list quotes, view a journal entry, load tenant settings,
-- issue/check a CPA access link) and confirm 200s exactly as before.

-- Rollback (per table, if needed):
-- ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- -- or, to keep RLS on but remove the tenant policy (falls back to the
-- -- "RLS on, no policy" state already live on 60 other tables):
-- DROP POLICY IF EXISTS tenant_isolation ON public.<table>;
