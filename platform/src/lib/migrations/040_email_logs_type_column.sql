-- Migration 040: email_logs.email_type column.
--
-- Used by emailAdmins() / alert logging so the monitoring dashboard can
-- count admin-alert deliveries in a single WHERE clause. Nycmaid has had
-- this since 3622dd6; fullloop stored everything in `metadata` JSONB which
-- is harder to query.

ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_type TEXT;
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_type
  ON email_logs(tenant_id, email_type, created_at DESC)
  WHERE email_type IS NOT NULL;
