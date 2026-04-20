-- Migration 021: team_members.stripe_ready_at
-- Tracks when Stripe Connect onboarding completed so stripe-status can
-- fire admin notifications once (instead of every POST).
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS stripe_ready_at TIMESTAMPTZ;

-- portal_leads — for /api/portal/collect (Selena's "finish your booking"
-- abandon-to-lead funnel).
CREATE TABLE IF NOT EXISTS portal_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  service_type TEXT,
  zip_code TEXT,
  city TEXT,
  notes TEXT,
  source TEXT,
  referrer_domain TEXT,
  conversation_id UUID REFERENCES sms_conversations(id),
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portal_leads_tenant_status ON portal_leads(tenant_id, status, created_at DESC);
ALTER TABLE portal_leads ENABLE ROW LEVEL SECURITY;
