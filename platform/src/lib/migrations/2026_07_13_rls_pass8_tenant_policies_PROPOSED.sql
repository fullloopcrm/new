-- PROPOSED — FILE ONLY. NOT RUN. Requires Jeff's approval before any environment.
-- Author: worker W4, branch p1-w4, 2026-07-13, per LEADER order 12:36:
-- "continue backlog 3-deep: next 3 RLS-gap + client tenantDb + verify green."
--
-- Source: pass 7 concluded all 8 remaining gap tables were blocked on a live
-- prod schema read and declared the file-only track exhausted. That's still
-- true for 6 of the 8 (projects, settings, booking_cleaners, cleaners,
-- cleaner_payouts, member_pin_reset_codes — no tracked CREATE TABLE at all).
-- It was NOT true for the other 2: `document_fields` and `document_activity`
-- (031_documents.sql:108,144). Both have had a fully tracked schema with
-- `tenant_id UUID NOT NULL REFERENCES tenants(id)` since pass 2/3 first found
-- them — the ONLY blocker each time was "missing covering index, out of
-- scope for this pass," and no pass ever came back to actually add it. This
-- pass closes that gap instead of re-reporting it a fourth time.
--
-- Both tables are live, actively written today via supabaseAdmin (grepped
-- src/app/api/documents/**: document_fields.insert in
-- api/documents/[id]/duplicate, api/documents/[id]/fields,
-- api/admin/requests/[id]/agreement; document_activity is read in
-- api/documents/[id]/route.ts). Same caveat as passes 1-7: every route uses
-- service_role, which bypasses RLS unconditionally, so this is
-- defense-in-depth only — provably inert on today's request paths.
--
-- What Jeff needs to do to run this (nothing has been executed):
--   1. Run on sandbox first.
--   2. Verify document upload / field-placement / signing / activity-log
--      routes still 200 (trivially true — service_role bypasses RLS, so
--      behavior is unchanged either way).
--   3. Promote to prod.
--
-- Rollback: `DROP POLICY tenant_isolation ON public.document_fields`,
-- `ALTER TABLE public.document_fields DISABLE ROW LEVEL SECURITY`,
-- `DROP INDEX idx_document_fields_tenant` (same 3 for document_activity).
-- No data risk either direction — RLS is additive, not applied to existing
-- reads/writes under service_role.
--
-- I did not run any of this. No DDL was executed in any environment.
--
-- Remaining scope after this pass: 50 (passes 1-7) + 2 (this pass) = 52/58.
-- 6 remain, ALL genuinely blocked on a live prod schema read (no other
-- file-only angle exists for them):
--   - projects — no CREATE TABLE found anywhere in the repo.
--   - settings — pass 2 finding, no tracked CREATE TABLE.
--   - booking_cleaners, cleaners, cleaner_payouts, member_pin_reset_codes —
--     still no tracked schema ("exists in prod via ad-hoc SQL").
-- Pass-9's actionable step is a `\d` against the real DB for these 6 (someone
-- with prod access) — no more mechanical/semantic-review passes are possible
-- against what's committed to the repo.
--
-- Full list in `flwork-p1-w5/deploy-prep/rls-coverage-audit.md`.

-- ── document_fields: add missing covering index, then standard policy ────
CREATE INDEX IF NOT EXISTS idx_document_fields_tenant ON document_fields(tenant_id);

ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.document_fields;
CREATE POLICY tenant_isolation ON public.document_fields
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  );

-- ── document_activity: add missing covering index, then standard policy ──
CREATE INDEX IF NOT EXISTS idx_document_activity_tenant ON document_activity(tenant_id);

ALTER TABLE public.document_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.document_activity;
CREATE POLICY tenant_isolation ON public.document_activity
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text
  );
