-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 12:01:
-- "continue backlog 3-deep: next 3 RLS-gap proposals."
--
-- Source: passes 1-5 covered 46/58 gap tables from W5's rls-coverage-audit.md.
-- Pass 5 named 12 remaining, ALL blocked on a Stage-0 prerequisite (tenant_id
-- NOT NULL + an index covering it) — it explicitly said "there is no pass-6
-- candidate list ... the next actionable step is a schema/index fix, not
-- another policy-authoring pass." This migration IS that schema-fix step for
-- the 3 of the 12 whose prerequisite is fixable without a live prod `\d` or a
-- data backfill:
--
--   job_events, team_notifications — tenant_id already UUID NOT NULL
--     (verified below), just missing a tenant_id-covering index. Step A adds
--     the index (safe, no data risk, CREATE INDEX IF NOT EXISTS). Step B adds
--     the policy in the SAME file since the prerequisite is now met — but
--     Step A must run first and be confirmed before Step B has any meaning.
--   error_logs — tenant_id is NULLABLE BY DESIGN (`ON DELETE SET NULL`,
--     006_error_resilience.sql:12) for platform-wide errors with no tenant
--     context. This does NOT need an index fix (idx_error_logs_tenant already
--     exists, 006_error_resilience.sql:38) — it needs a DIFFERENT policy
--     shape that lets platform-wide (NULL) rows stay visible instead of being
--     silently walled off by a naive tenant_id = current_setting(...) policy.
--
-- Verified per table against its CREATE TABLE / CREATE INDEX statements, not
-- assumed:
--   job_events          → src/lib/migrations/2026_07_02_jobs_projects.sql:83
--                         tenant_id UUID NOT NULL REFERENCES tenants(id).
--                         Only existing index: idx_job_events_job(job_id,
--                         created_at DESC) — tenant_id not a leading column
--                         anywhere. New index added below.
--   team_notifications  → src/lib/migrations/007_missing_tables.sql:133
--                         tenant_id uuid NOT NULL REFERENCES tenants(id).
--                         Only existing index: idx_team_notifications_member
--                         (team_member_id, read, created_at DESC) — same gap.
--                         New index added below.
--   error_logs           → src/lib/migrations/006_error_resilience.sql:8
--                         tenant_id uuid REFERENCES tenants(id) ON DELETE SET
--                         NULL (nullable, intentional — severity/route/
--                         user_id columns confirm this table also carries
--                         platform-level errors with no tenant). Already has
--                         idx_error_logs_tenant(tenant_id, created_at DESC).
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX — same caveat as passes 1-5: every
-- API route reads/writes via `supabaseAdmin` (service_role), which BYPASSES
-- RLS UNCONDITIONALLY. This migration is provably inert on today's request
-- paths.
--
-- What Jeff needs to do to run this (nothing has been executed): decide the
-- JWT-claims shape question (same open item as passes 1-5) → run Step A
-- (index) on sandbox first, confirm no lock contention on job_events/
-- team_notifications (both are high-write tables — job timeline + team
-- notification inserts — CREATE INDEX CONCURRENTLY may be preferred over the
-- plain CREATE INDEX below in prod) → then Step B (policies) → verify
-- service_role routes still 200 → promote. Rollback: `DROP INDEX` / `ALTER
-- TABLE … DISABLE ROW LEVEL SECURITY` per table, no data risk either way.
--
-- I did not run any of this. No DDL was executed in any environment.
--
-- Remaining scope after this pass: 46 (passes 1-5) + 3 (this pass) = 49/58.
-- 9 still blocked, unchanged:
--   - client_referral_stats — tenant_id nullable, needs the same
--     nullable-aware policy shape as error_logs (not attempted here — the
--     platform-wide-error semantics for error_logs are well-understood;
--     client_referral_stats' nullable case needs its own review of what a
--     NULL tenant_id row there actually means before copying this shape).
--   - projects — no CREATE TABLE found anywhere in the repo; needs a live
--     `\d projects` against the real DB.
--   - settings, document_fields, document_activity — pass 2/3 findings,
--     still unresolved.
--   - booking_cleaners, cleaners, cleaner_payouts, member_pin_reset_codes —
--     still no tracked schema.

-- ── Step A: add the missing tenant_id-covering indexes ──────────────────
CREATE INDEX IF NOT EXISTS idx_job_events_tenant ON job_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_notifications_tenant ON team_notifications(tenant_id, created_at DESC);

-- ── Step B: policies ─────────────────────────────────────────────────────
-- job_events + team_notifications: standard shape, same as passes 1-5.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'job_events',
    'team_notifications'
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
  END LOOP;
END $$;

-- error_logs: NULLABLE-tenant shape. A NULL tenant_id row is a platform-wide
-- error (no tenant context) and must stay visible/writable — the standard
-- `= current_setting(...)` predicate would silently wall those off, hiding
-- exactly the errors an on-call engineer needs to see. USING allows NULL rows
-- through unconditionally; WITH CHECK mirrors it so an insert/update can
-- still write a NULL tenant_id row (platform code, not a tenant-scoped
-- request) or a correctly-scoped one.
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.error_logs;
CREATE POLICY tenant_isolation ON public.error_logs
  FOR ALL
  USING (
    tenant_id IS NULL
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  )
  WITH CHECK (
    tenant_id IS NULL
    OR (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  );
