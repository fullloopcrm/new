-- Migration 023: add missing per-tenant Stripe key + Google OAuth storage.
-- Migration 008 intended to add these but the column is absent in the fullloop
-- production DB. The payment-processor and Stripe webhook both expect
-- tenant.stripe_api_key; google.ts expects tenant.google_tokens + google_business.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_api_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_tokens JSONB;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS google_business JSONB;

-- Encryption tracking: future audit of which rows still hold plaintext
-- refresh tokens (helpers rotate them on next save).
CREATE INDEX IF NOT EXISTS idx_tenants_google_tokens_present
  ON tenants((google_tokens IS NOT NULL));
