-- ── client_emails ────────────────────────────────────────────────────────
-- Queryable log of emails sent to a client, mirroring client_sms_messages.
-- Additive only — new table, no changes to existing tables. FILE ONLY:
-- leader runs this against prod after review, do not apply here.
CREATE TABLE IF NOT EXISTS client_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_emails_tenant_client ON client_emails(tenant_id, client_id, created_at);
ALTER TABLE client_emails ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
