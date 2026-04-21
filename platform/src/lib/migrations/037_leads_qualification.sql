-- Migration 037: Lead qualification + onboarding task queue
-- Prospect submits public form → lands here → super-admin reviews →
-- approved → Stripe checkout link → paid → tenant row created.

CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business identity
  business_name TEXT NOT NULL,
  legal_name TEXT,
  ein TEXT,
  entity_type TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT,

  -- Trade & territory
  trade TEXT NOT NULL,
  primary_city TEXT,
  primary_state TEXT,
  primary_zip TEXT,
  service_zips TEXT[],

  -- Growth signal
  years_in_business INTEGER,
  annual_revenue_bracket TEXT,       -- under_250k / 250k_1m / 1m_3m / 3m_plus
  revenue_trajectory TEXT,           -- up / flat / down
  team_size_wtwo INTEGER,
  team_size_contractor INTEGER,
  current_tech_stack TEXT,
  growth_target_12mo TEXT,

  -- AI fit
  uses_ai_tools BOOLEAN,
  ai_tools_list TEXT,
  ai_comfort_level INTEGER CHECK (ai_comfort_level BETWEEN 1 AND 10 OR ai_comfort_level IS NULL),
  has_crm BOOLEAN,
  crm_name TEXT,
  day_to_day_operator TEXT,           -- owner / ops_manager / other

  -- Commitment
  launch_timeline TEXT,                -- lt_30 / 30_90 / 90_plus
  territory_exclusive_ok BOOLEAN,
  top_pain_point TEXT,

  -- Context
  heard_from TEXT,
  biggest_competitor TEXT,
  wants_call BOOLEAN,

  -- Pricing tier pick
  tier_interest TEXT,                  -- starter / growth / pro / enterprise

  -- Qualification state
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','approved','rejected','paid','cancelled')),
  reject_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,

  -- Slot check cache
  slot_taken_at_submit BOOLEAN,

  -- Payment
  stripe_checkout_url TEXT,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  paid_tier TEXT,
  setup_fee_cents INTEGER,
  monthly_cents INTEGER,

  -- Resulting tenant
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_trade_zip_active
  ON prospects(trade, primary_zip)
  WHERE status IN ('approved','paid') AND primary_zip IS NOT NULL;

CREATE OR REPLACE FUNCTION prospects_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prospects_updated_at ON prospects;
CREATE TRIGGER trg_prospects_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION prospects_updated_at();

-- Onboarding account-creation task queue (tenant says "no I don't have X, please create")
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
    -- 'create_stripe' | 'create_telnyx' | 'create_resend' | 'create_google_business'
    -- | 'configure_imap' | 'configure_dns' | 'verify_10dlc'
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','blocked','completed','skipped')),
  notes TEXT,
  requested_by_tenant BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON onboarding_tasks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_tenant ON onboarding_tasks(tenant_id);

DROP TRIGGER IF EXISTS trg_onboarding_tasks_updated_at ON onboarding_tasks;
CREATE TRIGGER trg_onboarding_tasks_updated_at BEFORE UPDATE ON onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION prospects_updated_at();

-- tenant-side onboarding checklist progress (what they've filled in)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
