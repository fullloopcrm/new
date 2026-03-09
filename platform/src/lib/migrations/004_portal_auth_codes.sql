-- Portal authentication codes (replaces in-memory store)
CREATE TABLE portal_auth_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auth_codes_phone ON portal_auth_codes(phone, code);
CREATE INDEX idx_auth_codes_expires ON portal_auth_codes(expires_at);
ALTER TABLE portal_auth_codes ENABLE ROW LEVEL SECURITY;
