-- Migration 054: Stripe Financial Connections link
-- Records the Stripe FC account id on a bank_accounts row so the sync job can
-- pull transactions for it. Additive.
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS stripe_fc_account_id TEXT;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_fc ON bank_accounts(stripe_fc_account_id)
  WHERE stripe_fc_account_id IS NOT NULL;
