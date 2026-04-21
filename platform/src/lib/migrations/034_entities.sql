-- Migration 034: Multi-entity under one tenant.
-- One tenant (business owner) can own N entities (legal/accounting units).
-- Every finance row gets an entity_id. Existing rows backfilled into a
-- per-tenant "Main" entity created for backwards-compat.

-- ─── entities table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  legal_name TEXT,
  ein TEXT,                              -- 9-digit Employer ID Number
  entity_type TEXT CHECK (entity_type IN ('sole_prop','llc','s_corp','c_corp','partnership','other') OR entity_type IS NULL),
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  fiscal_year_start INTEGER NOT NULL DEFAULT 1 CHECK (fiscal_year_start BETWEEN 1 AND 12),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_tenant ON entities(tenant_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_tenant_default ON entities(tenant_id) WHERE is_default = TRUE;

CREATE OR REPLACE FUNCTION entities_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_entities_updated_at ON entities;
CREATE TRIGGER trg_entities_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION entities_updated_at();

-- ─── Seed a default entity per existing tenant ───────────────────
INSERT INTO entities (tenant_id, name, is_default, active)
SELECT t.id, COALESCE(t.name, 'Main'), TRUE, TRUE
FROM tenants t
WHERE NOT EXISTS (SELECT 1 FROM entities e WHERE e.tenant_id = t.id AND e.is_default);

-- ─── Add entity_id to finance tables ─────────────────────────────
-- chart_of_accounts: nullable for shared-across-entities design; default
-- entity for now. Per-entity chart is a v1.1 decision.
ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE bank_import_batches ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;

-- Backfill to default entity
UPDATE chart_of_accounts   SET entity_id = (SELECT id FROM entities WHERE tenant_id = chart_of_accounts.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE bank_accounts       SET entity_id = (SELECT id FROM entities WHERE tenant_id = bank_accounts.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE bank_import_batches SET entity_id = (SELECT id FROM entities WHERE tenant_id = bank_import_batches.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE bank_transactions   SET entity_id = (SELECT id FROM entities WHERE tenant_id = bank_transactions.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE journal_entries     SET entity_id = (SELECT id FROM entities WHERE tenant_id = journal_entries.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE journal_lines       SET entity_id = (SELECT id FROM entities WHERE tenant_id = journal_lines.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE expenses            SET entity_id = (SELECT id FROM entities WHERE tenant_id = expenses.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE recurring_expenses  SET entity_id = (SELECT id FROM entities WHERE tenant_id = recurring_expenses.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE invoices            SET entity_id = (SELECT id FROM entities WHERE tenant_id = invoices.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;
UPDATE payments            SET entity_id = (SELECT id FROM entities WHERE tenant_id = payments.tenant_id AND is_default LIMIT 1) WHERE entity_id IS NULL;

-- Indexes for entity-filtered queries
CREATE INDEX IF NOT EXISTS idx_coa_entity ON chart_of_accounts(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_entity ON bank_accounts(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_txns_entity ON bank_transactions(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_entries_entity ON journal_entries(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_journal_lines_entity ON journal_lines(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_entity ON expenses(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_entity ON invoices(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_entity ON payments(entity_id) WHERE entity_id IS NOT NULL;
