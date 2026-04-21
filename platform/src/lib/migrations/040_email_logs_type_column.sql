-- Migration 040: email_logs table + email_type column.
--
-- Tenant log of outbound emails (admin alerts, client reminders, system).
-- Used by emailAdmins() and the monitoring dashboard to count admin-alert
-- deliveries. Prod was missing this table entirely — migration 008's
-- CREATE TABLE never ran here — so this migration creates it fresh with
-- the email_type column already present.

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  resend_id TEXT,
  error TEXT,
  metadata JSONB,
  email_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- In case the table existed at an older shape, ensure the type column is there.
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_type TEXT;

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_type
  ON email_logs(tenant_id, email_type, created_at DESC)
  WHERE email_type IS NOT NULL;

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
