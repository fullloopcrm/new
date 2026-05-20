-- nycmaid parity: final batch of missing tables
-- Sources: nycmaid create-client-contacts.sql, create-client-sms-messages.sql, supabase/marketing_opt_out.sql, inferred push_subscriptions + sms_logs schemas
-- Skipped (covered by fullloop's own model):
--   admin_users      → Clerk + tenant_members
--   settings         → tenants table jsonb columns
--   tenant_memberships → tenant_members
--   client_referral_stats → view/aggregate (use fullloop's referrals/referrers tables)

-- ── client_contacts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT,
  phone_e164 TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  receives_sms BOOLEAN NOT NULL DEFAULT false,
  receives_email BOOLEAN NOT NULL DEFAULT false,
  sms_consent_at TIMESTAMPTZ,
  email_consent_at TIMESTAMPTZ,
  sms_opted_out_at TIMESTAMPTZ,
  email_opted_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_has_channel CHECK (phone_e164 IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_client_contacts_tenant ON client_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_phone ON client_contacts(phone_e164) WHERE phone_e164 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contacts_one_primary ON client_contacts(client_id) WHERE is_primary = true;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION touch_client_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_client_contacts_updated_at ON client_contacts;
CREATE TRIGGER trg_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts FOR EACH ROW EXECUTE FUNCTION touch_client_contacts_updated_at();

-- ── client_sms_messages ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_sms_tenant_client ON client_sms_messages(tenant_id, client_id, created_at);
ALTER TABLE client_sms_messages ENABLE ROW LEVEL SECURITY;

-- ── marketing_opt_out_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketing_opt_out_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  method TEXT NOT NULL CHECK (method IN ('email_link', 'sms_stop', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_opt_out_log_tenant_client ON marketing_opt_out_log(tenant_id, client_id);
ALTER TABLE marketing_opt_out_log ENABLE ROW LEVEL SECURITY;

-- ── push_subscriptions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  subscription JSONB NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','cleaner','client')),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, endpoint)
);
CREATE INDEX IF NOT EXISTS idx_push_subs_tenant_role ON push_subscriptions(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_push_subs_client ON push_subscriptions(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subs_team_member ON push_subscriptions(team_member_id) WHERE team_member_id IS NOT NULL;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── sms_logs (Telnyx delivery log) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  sms_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  telnyx_message_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant_created ON sms_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_booking ON sms_logs(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sms_logs_telnyx_id ON sms_logs(telnyx_message_id) WHERE telnyx_message_id IS NOT NULL;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
