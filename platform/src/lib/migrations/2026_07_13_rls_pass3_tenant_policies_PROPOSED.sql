-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 11:28:
-- "continue backlog 3-deep: next 10 RLS-gap tables policy proposals."
--
-- Source: W5's rls-coverage-audit.md (p1-w5) found 58 tenant_id tables with
-- ENABLE ROW LEVEL SECURITY never set in any migration. Pass 1
-- (2026_07_13_rls_top10_tenant_policies_PROPOSED.sql) covered clients,
-- bookings, sms_conversations(+messages), invoices(+activity),
-- bank_accounts/bank_transactions, documents(+signers). Pass 2
-- (2026_07_13_rls_next10_tenant_policies_PROPOSED.sql) covered quotes(+activity),
-- journal_entries/journal_lines, bank_import_batches, cpa_access_tokens,
-- tenant_settings, entities, job_payments, audit_log. This is PASS 3 (the
-- next 10 of the remaining 38): core-ops (booking_notes, crews, routes,
-- notifications), access-control/security (oauth_state_nonces,
-- tenant_invites), and accounting siblings (chart_of_accounts,
-- categorization_patterns, recurring_expenses, accounting_periods).
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX — same caveat as passes 1 & 2:
-- every API route reads/writes via `supabaseAdmin` (service_role), which
-- BYPASSES RLS UNCONDITIONALLY. This migration is provably inert on today's
-- request paths; it only matters for a future request-scoped (JWT) client
-- (tenant-isolation-rls-plan.md Stage 2/3) or as a backstop against a
-- misconfigured service_role / raw `pg` connection.
--
-- Policy shape: identical to passes 1 & 2 — matches the one already-deployed
-- policy (onboarding_tasks) and 2026_07_11_enable_rls_gap_tables.sql, reading
-- `current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'` as
-- text. Same open auth.jwt() vs current_setting question as before — still
-- unresolved, still equally inert either way today.
--
-- Stage-0 prerequisite (tenant_id UUID NOT NULL + an existing index covering
-- tenant_id) verified per table against its CREATE TABLE / CREATE INDEX
-- statements, not assumed:
--   booking_notes            → supabase/smart_scheduling.sql (idx_booking_notes_tenant)
--   crews                    → migrations/2026_07_03_crews.sql (idx_crews_tenant)
--   routes                   → src/lib/migrations/028_routes.sql (idx_routes_tenant_date, idx_routes_tenant_tm_date)
--   notifications            → supabase/schema.sql; index in src/lib/migrations/006_error_resilience.sql (idx_notifications_tenant_status, idx_notifications_tenant_type)
--   oauth_state_nonces       → src/lib/migrations/014_security_hardening.sql (idx_oauth_state_nonces_tenant)
--   tenant_invites           → migrations/admin-business-management.sql (idx_invites_token, idx_invites_email — NOTE: neither covers tenant_id directly, see caveat below)
--   chart_of_accounts        → src/lib/migrations/032_ledger.sql (idx_coa_tenant_code, idx_coa_tenant_type)
--   categorization_patterns  → src/lib/migrations/032_ledger.sql (idx_categ_patterns_tenant, idx_categ_patterns_tenant_pattern)
--   recurring_expenses       → src/lib/migrations/030_finance.sql (idx_recurring_expenses_tenant, idx_recurring_expenses_next_due)
--   accounting_periods       → src/lib/migrations/035_close_audit.sql (idx_periods_tenant_entity_year_month, idx_periods_tenant_status)
--
-- ⚠️ tenant_invites caveat (flagging, not silently including as clean): its
-- two indexes (idx_invites_token on `token`, idx_invites_email on `email`)
-- do NOT cover tenant_id. The column itself IS `tenant_id UUID NOT NULL
-- REFERENCES tenants(id)` (migrations/admin-business-management.sql line 16),
-- satisfying the NOT NULL half of Stage-0, but a tenant-scoped policy on an
-- unindexed column means Postgres will sequential-scan to evaluate the
-- policy predicate on any query the planner can't otherwise satisfy from
-- `token`/`email`. Table is almost certainly small (invite rows are
-- ephemeral), so I'm including it, but flagging the missing
-- `CREATE INDEX ... ON tenant_invites(tenant_id)` as a cheap follow-up if
-- this table grows or the policy shows up in slow-query logs later.
--
-- EXCLUDED from this pass, with reasons (flagging for Jeff/leader rather
-- than silently omitting):
--   - `booking_cleaners`, `cleaners`, `cleaner_payouts`,
--     `member_pin_reset_codes`: all four are actively read/written by app
--     code (e.g. src/lib/selena/tools.ts, src/app/api/pin-reset/route.ts,
--     src/app/site/nyc-mobile-salon/_lib/*.ts) but have **no `CREATE TABLE`**
--     for these exact names anywhere in migrations/, src/lib/migrations/, or
--     supabase/ — same situation W5/pass-2 flagged for the bare `settings`
--     table: they almost certainly exist in prod via ad-hoc SQL that never
--     landed in a tracked migration. I will not author RLS DDL against a
--     schema I can't verify from source. Needs a live `\d <table>` against
--     the real DB to confirm columns (does it even have `tenant_id`? NOT
--     NULL? indexed?) before any of the four can get a policy.
--   - `document_activity`: has `tenant_id UUID NOT NULL`
--     (src/lib/migrations/031_documents.sql line 147) but its only index
--     (`idx_document_activity_doc`) covers `document_id`, not `tenant_id` —
--     same Stage-0 failure mode as `document_fields` in pass 2. Needs
--     `CREATE INDEX ... ON document_activity(tenant_id)` first (separate,
--     small migration) before it can join this list.
--   - Remaining ~24 gap tables (sales/applications, e-sign leftovers,
--     messaging logs, jobs/projects, `settings`, plus the four above) are
--     lower-sensitivity or already deferred pending the schema/index
--     questions above — see rls-coverage-audit.md in p1-w5's deploy-prep/
--     for the full remaining list.
--
-- Same WITH CHECK inclusion as passes 1 & 2 (FOR ALL, not SELECT-only like
-- onboarding_tasks) — confirm that's wanted before running, same as before.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'booking_notes',
    'crews',
    'routes',
    'notifications',
    'oauth_state_nonces',
    'tenant_invites',
    'chart_of_accounts',
    'categorization_patterns',
    'recurring_expenses',
    'accounting_periods'
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
--   AND c.relname IN ('booking_notes','crews','routes','notifications',
--     'oauth_state_nonces','tenant_invites','chart_of_accounts',
--     'categorization_patterns','recurring_expenses','accounting_periods')
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
--
-- Expect rls_enabled = true, policy_count = 1 for all 10.
--
-- Then re-verify service_role is unaffected (the inertness proof): run a
-- normal supabaseAdmin-backed API request that touches each of these 10
-- tables (e.g. add a booking note, load a route, list crews, fetch
-- notifications, redeem an oauth nonce, accept a tenant invite, load chart
-- of accounts, categorize a transaction, list recurring expenses, open an
-- accounting period) and confirm 200s exactly as before.

-- Rollback (per table, if needed):
-- ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- -- or, to keep RLS on but remove the tenant policy (falls back to the
-- -- "RLS on, no policy" state already live on 60 other tables):
-- DROP POLICY IF EXISTS tenant_isolation ON public.<table>;
