-- Adopted from legacy hand-run migration: 005_audit_logs.sql
-- Original commit date (git first-add): 2026-03-09T15:54:34-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Audit trail / activity log
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  user_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
