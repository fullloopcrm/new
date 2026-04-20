-- Parity migration: nycmaid schema features missing in fullloop
-- Ported 2026-04-19

-- ============================================================
-- CLIENTS
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS do_not_service BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pet_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS pet_type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS outreach_count INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS apology_credit_pct NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS apology_credit_reason TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS apology_credit_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_do_not_service ON clients(tenant_id, do_not_service) WHERE do_not_service = true;
CREATE INDEX IF NOT EXISTS idx_clients_pin ON clients(tenant_id, pin) WHERE pin IS NOT NULL;

-- ============================================================
-- TEAM MEMBERS (nycmaid "cleaners")
-- ============================================================
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT true;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS labor_only BOOLEAN DEFAULT false;

-- ============================================================
-- BOOKINGS
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_member_pay INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_member_paid BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_member_paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_location JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_location JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS partial_payment_cents INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_sender_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fifteen_min_alert_time TIMESTAMPTZ;

-- ============================================================
-- SMS CONVERSATIONS
-- ============================================================
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS quality_score INTEGER;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS quality_issues JSONB;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS preferred_date DATE;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS preferred_time TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS service_type TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS bedrooms TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS bathrooms TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id);

-- ============================================================
-- SELENA MEMORY
-- ============================================================
CREATE TABLE IF NOT EXISTS selena_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_selena_memory_tenant_client ON selena_memory(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_selena_memory_type ON selena_memory(tenant_id, type);
ALTER TABLE selena_memory ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PAYMENTS + PAYOUTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id),
  client_id UUID REFERENCES clients(id),
  amount_cents INTEGER NOT NULL,
  tip_cents INTEGER DEFAULT 0,
  method TEXT,
  status TEXT DEFAULT 'pending',
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  sender_name TEXT,
  raw_email_id TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_booking ON payments(tenant_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session ON payments(stripe_session_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS team_member_payouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  booking_id UUID REFERENCES bookings(id),
  payment_id UUID REFERENCES payments(id),
  amount_cents INTEGER NOT NULL,
  tip_cents INTEGER DEFAULT 0,
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payouts_tenant_member ON team_member_payouts(tenant_id, team_member_id);
ALTER TABLE team_member_payouts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ADMIN TASKS (ops queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  title TEXT NOT NULL,
  description TEXT,
  related_type TEXT,
  related_id UUID,
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_tasks_tenant_status ON admin_tasks(tenant_id, status, priority);
ALTER TABLE admin_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- UNMATCHED PAYMENTS (Zelle/Venmo reconciliation queue)
-- ============================================================
CREATE TABLE IF NOT EXISTS unmatched_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  method TEXT,
  sender_name TEXT,
  sender_email TEXT,
  raw_email_id TEXT,
  raw_email_subject TEXT,
  raw_email_body TEXT,
  status TEXT DEFAULT 'pending',
  matched_booking_id UUID REFERENCES bookings(id),
  matched_by UUID,
  matched_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unmatched_payments_tenant_status ON unmatched_payments(tenant_id, status);
ALTER TABLE unmatched_payments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SYSTEM STATE (key-value health counters)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BANK STATEMENTS (bookkeeping)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  account_name TEXT,
  file_url TEXT,
  parsed_data JSONB,
  reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_statements_tenant_date ON bank_statements(tenant_id, statement_date DESC);
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DEALS (sales pipeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  title TEXT NOT NULL,
  stage TEXT DEFAULT 'lead',
  value_cents INTEGER DEFAULT 0,
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  owner_id UUID,
  source TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  closed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON deals(tenant_id, stage, status);
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  actor_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deal_activities_deal ON deal_activities(deal_id, created_at DESC);
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LEAD CLICKS (referral link tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ref_code TEXT,
  action TEXT,
  session_id TEXT,
  device TEXT,
  page TEXT,
  referrer_url TEXT,
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_clicks_tenant_ref ON lead_clicks(tenant_id, ref_code, created_at DESC);
ALTER TABLE lead_clicks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- BLOCKED REFERRERS
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_referrers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referrer_url TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, referrer_url)
);
ALTER TABLE blocked_referrers ENABLE ROW LEVEL SECURITY;
