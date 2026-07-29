-- Adopted from legacy hand-run migration: 036_cpa_retry.sql
-- Original commit date (git first-add): 2026-04-21T11:38:58-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
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
