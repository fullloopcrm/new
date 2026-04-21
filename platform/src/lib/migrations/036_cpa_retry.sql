-- Migration 036: CPA access tokens + recurring-expense retry tracking.

CREATE TABLE IF NOT EXISTS cpa_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  cpa_name TEXT,
  cpa_email TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cpa_tokens_tenant ON cpa_access_tokens(tenant_id) WHERE revoked_at IS NULL;

ALTER TABLE recurring_expenses
  ADD COLUMN IF NOT EXISTS last_fired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS failure_count INTEGER NOT NULL DEFAULT 0;
