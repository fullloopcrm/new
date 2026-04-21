-- Migration 030: Finance — recurring expenses, cash flow, payroll/1099 fields
-- Builds on existing expenses + payments + team_member_payouts + bookings.

-- Recurring expenses (rent, insurance, software subs, etc.)
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT,
  amount_cents INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_due_date DATE,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_tenant ON recurring_expenses(tenant_id) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(tenant_id, next_due_date) WHERE active = TRUE;

CREATE OR REPLACE FUNCTION recurring_expenses_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER trg_recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION recurring_expenses_updated_at();

-- Team member 1099/tax fields
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS tax_classification TEXT CHECK (tax_classification IN ('1099', 'w2', 'other') OR tax_classification IS NULL),
  ADD COLUMN IF NOT EXISTS tax_address TEXT,
  ADD COLUMN IF NOT EXISTS tax_city TEXT,
  ADD COLUMN IF NOT EXISTS tax_state TEXT,
  ADD COLUMN IF NOT EXISTS tax_zip TEXT,
  ADD COLUMN IF NOT EXISTS tax_ssn_last4 TEXT,            -- last 4 only; full SSN stored encrypted
  ADD COLUMN IF NOT EXISTS tax_ssn_encrypted TEXT,        -- via encryptSecret()
  ADD COLUMN IF NOT EXISTS tax_ein TEXT,                   -- for LLCs
  ADD COLUMN IF NOT EXISTS tax_business_name TEXT;

-- Expense categories — JSONB on tenants so no separate table needed
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS expense_categories JSONB NOT NULL DEFAULT
    '["supplies","fuel","insurance","rent","software","marketing","utilities","payroll_fees","vehicle","equipment","travel","meals","other"]'::jsonb;

-- Expense enhancements
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS vendor_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS tax_deductible BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_category ON expenses(tenant_id, category);
