-- Adopted from legacy hand-run migration: 054_bank_fc.sql
-- Original commit date (git first-add): 2026-07-05T21:33:39-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Migration 054: Stripe Financial Connections link
-- Records the Stripe FC account id on a bank_accounts row so the sync job can
-- pull transactions for it. Additive.
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS stripe_fc_account_id TEXT;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_fc ON bank_accounts(stripe_fc_account_id)
  WHERE stripe_fc_account_id IS NOT NULL;
