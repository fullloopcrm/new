-- Migration 032: Double-entry ledger + bank import foundation
-- Phase 2 Sprint 1. CSV/OFX import → bank_transactions → dedupe → journal
-- entries. Plaid slots in later as an alternative import source.

-- ─── chart_of_accounts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                    -- e.g. 1010, 1100, 4000
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset','liability','equity','income','expense')),
  subtype TEXT,                          -- bank, ar, ap, cogs, revenue, operating_expense, etc.
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  is_bank_account BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coa_tenant_code ON chart_of_accounts(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_coa_tenant_type ON chart_of_accounts(tenant_id, type, active);

-- ─── bank_accounts ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  coa_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  institution TEXT,
  type TEXT CHECK (type IN ('checking','savings','credit_card','loan','other') OR type IS NULL),
  mask TEXT,                             -- last 4
  currency TEXT NOT NULL DEFAULT 'USD',
  current_balance_cents BIGINT,
  as_of_date DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id, active);

-- ─── bank_import_batches ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('csv','ofx','qfx','plaid','manual')),
  filename TEXT,
  sha256 TEXT,                           -- of the uploaded file; dedupe source files
  row_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_import_batches_tenant ON bank_import_batches(tenant_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_import_batches_sha ON bank_import_batches(bank_account_id, sha256) WHERE sha256 IS NOT NULL;

-- ─── bank_transactions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  import_batch_id UUID REFERENCES bank_import_batches(id) ON DELETE SET NULL,

  txn_date DATE NOT NULL,
  posted_date DATE,
  description TEXT NOT NULL,
  counterparty TEXT,
  amount_cents BIGINT NOT NULL,           -- negative = outflow, positive = inflow
  currency TEXT NOT NULL DEFAULT 'USD',
  check_number TEXT,
  external_id TEXT,                       -- FITID from OFX or plaid_transaction_id

  -- Dedupe fingerprint: sha256(date|amount|normalized_desc)
  fingerprint TEXT NOT NULL,

  -- Categorization (AI-assisted, tenant-approved)
  suggested_coa_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  suggested_confidence NUMERIC(4,3),      -- 0.000 - 1.000
  coa_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  memo TEXT,

  -- Reconciliation link
  journal_entry_id UUID,                  -- set when posted
  matched_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  matched_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  matched_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','categorized','matched','posted','ignored','duplicate')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_txns_tenant_status ON bank_transactions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bank_txns_account_date ON bank_transactions(bank_account_id, txn_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_txns_account_fp ON bank_transactions(bank_account_id, fingerprint);

-- ─── journal_entries + journal_lines (double-entry) ─────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  memo TEXT,
  source TEXT,                            -- 'bank_txn' | 'booking' | 'invoice' | 'expense' | 'manual' | 'system'
  source_id UUID,                         -- polymorphic ref to originating row
  posted BOOLEAN NOT NULL DEFAULT TRUE,
  period_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_tenant_date ON journal_entries(tenant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_tenant_source ON journal_entries(tenant_id, source, source_id);

CREATE TABLE IF NOT EXISTS journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  coa_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit_cents BIGINT NOT NULL DEFAULT 0,
  credit_cents BIGINT NOT NULL DEFAULT 0,
  memo TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT chk_journal_line_single_side CHECK (
    (debit_cents > 0 AND credit_cents = 0) OR
    (debit_cents = 0 AND credit_cents > 0) OR
    (debit_cents = 0 AND credit_cents = 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id, position);
CREATE INDEX IF NOT EXISTS idx_journal_lines_coa_tenant ON journal_lines(coa_id, tenant_id);

-- Double-entry integrity trigger: sum(debits) must equal sum(credits) per entry
CREATE OR REPLACE FUNCTION check_journal_balance() RETURNS TRIGGER AS $$
DECLARE
  d BIGINT;
  c BIGINT;
  entry UUID;
BEGIN
  entry := COALESCE(NEW.entry_id, OLD.entry_id);
  SELECT COALESCE(SUM(debit_cents), 0), COALESCE(SUM(credit_cents), 0)
    INTO d, c FROM journal_lines WHERE entry_id = entry;
  IF d <> c THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced (debits %, credits %)', entry, d, c;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Defer balance check to end-of-statement using constraint trigger
DROP TRIGGER IF EXISTS trg_journal_balance ON journal_lines;
CREATE CONSTRAINT TRIGGER trg_journal_balance
  AFTER INSERT OR UPDATE OR DELETE ON journal_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_journal_balance();

-- ─── transaction_categorization_learning ─────────────────────────────
-- Per-tenant learning table for AI categorization: counterparty/description
-- patterns → most-used coa_id. Used as prior before LLM call.
CREATE TABLE IF NOT EXISTS categorization_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,                  -- normalized substring or regex
  coa_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE CASCADE,
  hit_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categ_patterns_tenant ON categorization_patterns(tenant_id, hit_count DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categ_patterns_tenant_pattern ON categorization_patterns(tenant_id, pattern);
