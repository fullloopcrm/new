-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 11:12.
--
-- Source: W5's rls-coverage-audit.md (p1-w5) found 58 tenant_id tables with
-- ENABLE ROW LEVEL SECURITY never set in any migration. This migration adds
-- RLS + a tenant-scoped policy to the 10 highest-risk of those 58, per the
-- leader-specified categories: clients, bookings, sms_conversations (+ its
-- message-content child table), invoices (+ its activity log), bank_* (both
-- ledger tables), and documents (+ its e-sign child table).
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX:
-- Every API route today reads/writes via `supabaseAdmin` (service_role key),
-- and service_role BYPASSES RLS UNCONDITIONALLY — Postgres does not evaluate
-- policies for that role. So this migration has ZERO effect on current
-- request paths. The live tenant-isolation gate today is exclusively each
-- query's application-level `.eq('tenant_id', …)` filter (see
-- platform/docs/tenant-isolation-rls-plan.md, "Current state"). This
-- migration only closes the gap for a *future* request-scoped (JWT) client
-- path per that plan's Stage 1/2, and as a backstop if service_role were
-- ever misconfigured or a raw `pg` connection bypassed the app layer.
--
-- Policy shape: matches the ONE already-deployed tenant-scoped policy in
-- this codebase (onboarding_tasks, in 039_atomic_ledger_and_hardening.sql)
-- and the pattern used in 2026_07_11_enable_rls_gap_tables.sql — reads
-- `current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'` as
-- text, NOT the plan doc's untested `auth.jwt()->>'tenant_id'` form. Chosen
-- for consistency with what's actually live in prod today; both forms are
-- equally inert while service_role is the only caller. Whoever builds the
-- Stage 2 scoped-JWT client should confirm which claim shape it mints and
-- adjust if needed before Stage 3 migrates any call site onto it.
--
-- All 10 tables already satisfy the plan's Stage 0 prerequisite: tenant_id
-- is UUID NOT NULL with an existing index on every one (verified against
-- their CREATE TABLE statements: bookings/clients/sms_conversations/
-- sms_conversation_messages in migrations/2026_05_09_tenant_id_core.sql;
-- invoices/invoice_activity in src/lib/migrations/027_invoices.sql;
-- bank_accounts/bank_transactions in src/lib/migrations/032_ledger.sql;
-- documents/document_signers in src/lib/migrations/031_documents.sql).
--
-- FOR JEFF: this needs a decision, not just a run:
--   1. Confirm the JWT-claims policy shape is what Stage 2 should target
--      (see the "Policy shape" note above) before spending effort wiring
--      a scoped client to it.
--   2. Run against a branch/sandbox DB first per the plan's Stage 1 —
--      verify `service_role` reads/writes are unaffected (proves inertness)
--      — then prod. Rollback is `ALTER TABLE … DISABLE ROW LEVEL SECURITY;`
--      per table, or drop the policy and leave RLS enabled+policy-less
--      (equivalent to the other 60 "RLS on, no policy" tables already live).
--   3. WITH CHECK is included on all 10 (unlike onboarding_tasks, which is
--      SELECT-only with no WITH CHECK) so inserts/updates are covered too
--      once a scoped client exists — confirm that's wanted before running.
--
-- Remaining 48 of the 58 gap tables are NOT covered here (out of scope for
-- this pass) — see rls-coverage-audit.md in p1-w5's deploy-prep/ for the
-- full list if a follow-up pass is wanted.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'clients',
    'bookings',
    'sms_conversations',
    'sms_conversation_messages',
    'invoices',
    'invoice_activity',
    'bank_accounts',
    'bank_transactions',
    'documents',
    'document_signers'
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
--   AND c.relname IN ('clients','bookings','sms_conversations',
--     'sms_conversation_messages','invoices','invoice_activity',
--     'bank_accounts','bank_transactions','documents','document_signers')
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
--
-- Expect rls_enabled = true, policy_count = 1 for all 10.
--
-- Then re-verify service_role is unaffected (the inertness proof):
-- run a normal supabaseAdmin-backed API request against each of the 10
-- tables' routes (e.g. GET a client, list bookings, list invoices) and
-- confirm 200s exactly as before — service_role bypasses RLS so nothing
-- should change.

-- Rollback (per table, if needed):
-- ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- -- or, to keep RLS on but remove the tenant policy (falls back to the
-- -- "RLS on, no policy" state already live on 60 other tables):
-- DROP POLICY IF EXISTS tenant_isolation ON public.<table>;
