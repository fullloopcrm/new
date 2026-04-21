-- Migration 033: Receipt attachments + OCR metadata.
-- Receipts live in Supabase Storage bucket 'receipts' (tenant-prefixed).
-- They can attach to a bank_transaction OR be standalone (creates an expense).

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Bank transaction attachments
ALTER TABLE bank_transactions
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_extracted JSONB;
  -- { vendor, amount_cents, date, raw_text, line_items?, tax_cents? }

CREATE INDEX IF NOT EXISTS idx_bank_txns_has_receipt ON bank_transactions(tenant_id) WHERE receipt_path IS NOT NULL;

-- Expense attachments (extend existing expenses table)
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt_extracted JSONB,
  ADD COLUMN IF NOT EXISTS matched_bank_transaction_id UUID REFERENCES bank_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_matched_bank_txn ON expenses(matched_bank_transaction_id) WHERE matched_bank_transaction_id IS NOT NULL;
