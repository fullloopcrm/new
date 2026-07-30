-- client_documents: generic file-attachment tracking, tenant-scoped.
--
-- Backs a new reusable "attach a document to a client (or to the tenant
-- itself)" feature -- distinct from the existing `documents` /
-- `document_signers` e-signature workflow (draft->sent->viewed->signed state
-- machine) and from `hr_documents` (employee-compliance-only). Files
-- themselves live in the existing `uploads` Supabase Storage bucket via
-- POST /api/uploads; this table is only the tracking row.
--
-- client_id is nullable BY DESIGN: NULL means the document is attached to the
-- TENANT record itself (e.g. a signed sales proposal attached from the
-- platform-admin business detail page), not to any one client. A non-null
-- value means it's attached to that specific client.
--
-- FILE ONLY -- NOT RUN. Per platform/docs/adr/0008-migration-tool-cutover.md /
-- platform/docs/runbooks/migration-runbook.md, a prod DB write is a GATED action
-- (Jeff's explicit per-migration go, then LEADER runs `supabase db push`).
-- This worker authored + syntax-checked the file only; see the PR/commit
-- description for the explicit hand-off.
--
-- POST-apply verification (run after `supabase db push`):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'client_documents' ORDER BY ordinal_position;
--   -- expect: id, tenant_id, client_id (nullable), file_name, file_url,
--   -- file_size_bytes, content_type, uploaded_by, created_at
--
--   SELECT indexname FROM pg_indexes WHERE tablename = 'client_documents';
--   -- expect idx_client_documents_tenant_client to be present

CREATE TABLE IF NOT EXISTS client_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id        UUID REFERENCES clients(id) ON DELETE CASCADE,
  file_name        TEXT NOT NULL,
  file_url         TEXT NOT NULL,
  file_size_bytes  INTEGER,
  content_type     TEXT,
  uploaded_by      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_documents_tenant_client
  ON client_documents(tenant_id, client_id);

-- Same tenant_isolation policy shape as every other tenant table covered by
-- the 2026-07-28 RLS gap closure (deploy-prep/rls-gap-closure-corrected.sql +
-- 2026_07_28_rls_gap_closure_post_july15.sql). Currently inert (every route
-- still uses the service_role client, which bypasses RLS) until the scoped-
-- client cutover lands -- see that migration's header for the full context.
-- A brand-new tenant table should not reopen the exact gap that migration
-- was written to close.
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON client_documents;
CREATE POLICY tenant_isolation ON client_documents
  FOR ALL TO authenticated
  USING      (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
