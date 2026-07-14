-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 12:12:
-- "continue backlog 3-deep: next 3 RLS-gap proposals."
--
-- Source: pass 6 (2026_07_13_rls_pass6_tenant_policies_PROPOSED.sql) closed
-- job_events/team_notifications/error_logs and explicitly deferred
-- client_referral_stats, saying its nullable tenant_id "needs its own review
-- of what a NULL tenant_id row there actually means before copying
-- [error_logs'] shape." This pass IS that review.
--
-- Table: client_referral_stats (src/lib/migrations/010_nycmaid_parity_columns_2.sql:22-30)
--   id uuid PK, tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE
--   (nullable — no NOT NULL, no default), referrer_id uuid (no FK declared),
--   ref_code text, referrer_name text, clients_referred/total_bookings int,
--   total_revenue numeric. No index of any kind on this table today (grep
--   confirmed zero CREATE INDEX statements referencing client_referral_stats
--   anywhere in src/lib/migrations).
--
-- What a NULL tenant_id row here would mean: NOTHING LIVE. Unlike error_logs
-- (which has a real, documented platform-wide-error use case — severity/
-- route/user_id columns with no tenant scope by design), this table has ZERO
-- application code references anywhere in src/ outside migration files —
-- grepped `client_referral_stats` across src/**/*.ts (excluding tests and
-- migrations): 0 hits. No route reads it, no route writes it, no cron
-- populates it. It was created for NYC Maid parity (010_nycmaid_parity_
-- columns_2.sql's own comment: "missing stats table") and never wired up.
--
-- Conclusion: the nullable tenant_id is not a real semantic (no code path
-- intentionally inserts a tenant-less row) — it is a latent schema gap on a
-- currently-dead table. error_logs' "IS NULL OR =" policy shape does NOT
-- apply here; that shape would be actively wrong (it would silently permit a
-- future buggy insert to write an orphaned, tenant-less row that every tenant
-- could then read). The correct fix is the SAME as job_events/
-- team_notifications in pass 6: tighten the prerequisite, then use the
-- standard equality policy — except here the prerequisite is a NOT NULL
-- constraint (not just an index), and BOTH the constraint and the index are
-- missing.
--
-- ⚠️ DEFENSE-IN-DEPTH ONLY, NOT A LIVE FIX — same caveat as passes 1-6: every
-- API route reads/writes via `supabaseAdmin` (service_role), which BYPASSES
-- RLS UNCONDITIONALLY. This migration is provably inert on today's request
-- paths (doubly so here since nothing calls this table at all).
--
-- What Jeff needs to do to run this (nothing has been executed):
--   1. Confirm on prod there are zero existing rows with tenant_id IS NULL
--      (expected: the table should be empty or near-empty given zero code
--      references — `SELECT count(*) FROM client_referral_stats WHERE
--      tenant_id IS NULL` should return 0). If any exist, decide whether to
--      backfill or delete before Step A can succeed (SET NOT NULL fails on
--      a table with existing NULLs).
--   2. Run Step A (index + NOT NULL) on sandbox first.
--   3. Run Step B (policy) once Step A is confirmed.
--   4. Verify service_role routes still 200 (trivially true here — nothing
--      calls this table).
--   5. Promote to prod, or fold into a future migration that actually wires
--      this table up (out of scope for this pass).
--
-- Rollback: `ALTER TABLE client_referral_stats ALTER COLUMN tenant_id DROP
-- NOT NULL`, `DROP INDEX idx_client_referral_stats_tenant`, `ALTER TABLE …
-- DISABLE ROW LEVEL SECURITY`. No data risk in either direction — table is
-- unreferenced by any live code path.
--
-- I did not run any of this. No DDL was executed in any environment.
--
-- Remaining scope after this pass: 46 (passes 1-5) + 3 (pass 6) + 1 (this
-- pass) = 50/58. 8 still blocked, unchanged from pass 6's list minus this
-- table:
--   - projects — no CREATE TABLE found anywhere in the repo; needs a live
--     `\d projects` against the real DB.
--   - settings, document_fields, document_activity — pass 2/3 findings,
--     still unresolved.
--   - booking_cleaners, cleaners, cleaner_payouts, member_pin_reset_codes —
--     still no tracked schema (same "exists in prod via ad-hoc SQL"
--     situation as projects).
-- All 8 remain blocked on the same thing: a live prod schema read. No more
-- mechanical/semantic-review passes are possible against what's in-repo —
-- pass-8's actionable step is a `\d` against the real DB, not another file
-- audit.

-- ── Step A: tighten the prerequisite (NOT NULL + covering index) ─────────
-- Guarded by the same precondition Jeff must confirm in step 1 above — this
-- statement will fail loudly (not silently corrupt data) if any NULL rows
-- exist, which is the correct fail-closed behavior for an unreviewed backfill.
ALTER TABLE client_referral_stats ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_referral_stats_tenant ON client_referral_stats(tenant_id);

-- ── Step B: standard tenant-isolation policy (same shape as passes 1-5) ──
ALTER TABLE public.client_referral_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.client_referral_stats;
CREATE POLICY tenant_isolation ON public.client_referral_stats
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  );
