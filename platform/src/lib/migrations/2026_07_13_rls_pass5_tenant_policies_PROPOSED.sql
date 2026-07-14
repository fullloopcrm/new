-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 11:54:
-- "continue backlog 3-deep: RLS-gap policy proposals."
--
-- Source: W5's rls-coverage-audit.md (p1-w5) found 58 tenant_id tables with
-- ENABLE ROW LEVEL SECURITY never set in any migration. Passes 1-4 covered
-- 40 of the 58. This is PASS 5 — the 6 "verified-clean" candidates pass-4
-- flagged but did not itself include: products, quote_templates,
-- recurring_schedules, schedule_issues, yinez_memory, yinez_skills.
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX — same caveat as passes 1-4: every
-- API route reads/writes via `supabaseAdmin` (service_role), which BYPASSES
-- RLS UNCONDITIONALLY. This migration is provably inert on today's request
-- paths; it only matters for a future request-scoped (JWT) client
-- (tenant-isolation-rls-plan.md Stage 2/3) or as a backstop against a
-- misconfigured service_role / raw `pg` connection.
--
-- Policy shape: identical to passes 1-4 — matches the one already-deployed
-- policy (onboarding_tasks) and 2026_07_11_enable_rls_gap_tables.sql, reading
-- `current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id'` as
-- text. Same open auth.jwt() vs current_setting question as before — still
-- unresolved, still equally inert either way today.
--
-- Stage-0 prerequisite (tenant_id UUID NOT NULL + an existing index covering
-- tenant_id) verified per table against its CREATE TABLE / CREATE INDEX
-- statements, not assumed (pass-4's list said these 6 were "verified-clean
-- candidates" but pass 4 itself did not cite file/line — re-verified here):
--   products              → migrations/2026_07_03_catalog.sql:32 (tenant_id uuid NOT NULL, no FK)
--                           + idx_products_tenant(tenant_id, active, sort_order) — leading column tenant_id
--   quote_templates       → src/lib/migrations/026_quotes.sql:93 (tenant_id UUID NOT NULL REFERENCES tenants)
--                           + idx_quote_templates_tenant(tenant_id, active)
--   recurring_schedules   → supabase/schema.sql:173 (tenant_id UUID NOT NULL REFERENCES tenants)
--                           + idx_recurring_schedules_tenant ON recurring_schedules(tenant_id)
--   schedule_issues       → supabase/smart_scheduling.sql:20 (tenant_id UUID NOT NULL REFERENCES tenants)
--                           + idx_schedule_issues_tenant ON schedule_issues(tenant_id)
--   yinez_memory          → migrations/2026_05_19_yinez_tables.sql:6 (tenant_id uuid NOT NULL REFERENCES tenants)
--                           + idx_yinez_memory_tenant ON yinez_memory(tenant_id)
--   yinez_skills          → migrations/2026_05_19_yinez_tables.sql:32 (tenant_id uuid NOT NULL REFERENCES tenants)
--                           + UNIQUE (tenant_id, name) — leading column tenant_id
--
-- Note: `products` and the two `yinez_*` tables live in the repo-root
-- `migrations/` directory, not `src/lib/migrations/` or `supabase/` — pass 4
-- only searched the latter two, which is why it couldn't cite these three and
-- filed them as merely "verified-clean" rather than sourcing them. Confirmed
-- present and correct on this pass.
--
-- Tables NOT included here (already covered by passes 1-4, or still blocked —
-- see rls-pass4-migration-proposal.md's "Remaining scope" + W5's
-- rls-coverage-audit.md for the full remaining list):
--   - 5 flagged in pass 4 (client_referral_stats — nullable tenant_id;
--     error_logs — intentionally nullable, needs its own policy shape;
--     job_events, team_notifications — tenant_id NOT NULL but no
--     tenant_id-covering index; projects — no CREATE TABLE found anywhere,
--     needs a live `\d projects` first) — still blocked, unchanged this pass.
--   - settings, document_fields, document_activity — pass 2/3 findings,
--     still unresolved.
--   - booking_cleaners, cleaners, cleaner_payouts, member_pin_reset_codes —
--     still no tracked schema (same "exists in prod via ad-hoc SQL" issue
--     as projects).
--
-- Same WITH CHECK inclusion as passes 1-4 (FOR ALL, not SELECT-only like
-- onboarding_tasks) — confirm that's wanted before running, same as before.

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'products',
    'quote_templates',
    'recurring_schedules',
    'schedule_issues',
    'yinez_memory',
    'yinez_skills'
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
--   AND c.relname IN ('products','quote_templates','recurring_schedules',
--     'schedule_issues','yinez_memory','yinez_skills')
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
--
-- Expect rls_enabled = true, policy_count = 1 for all 6.
--
-- Then re-verify service_role is unaffected (the inertness proof): run a
-- normal supabaseAdmin-backed API request that touches each of these 6
-- tables (list/create a product, create a quote template, create/update a
-- recurring schedule, create a schedule issue, write/read a yinez_memory
-- row, create/list a yinez_skill) and confirm 200s exactly as before.

-- Rollback (per table, if needed):
-- ALTER TABLE public.<table> DISABLE ROW LEVEL SECURITY;
-- -- or, to keep RLS on but remove the tenant policy (falls back to the
-- -- "RLS on, no policy" state already live on 60+ other tables):
-- DROP POLICY IF EXISTS tenant_isolation ON public.<table>;
