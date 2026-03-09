-- Business management columns on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'setup';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS monthly_rate INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_fee INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_fee_paid_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Invite system
CREATE TABLE IF NOT EXISTS tenant_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invites_token ON tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON tenant_invites(email);
