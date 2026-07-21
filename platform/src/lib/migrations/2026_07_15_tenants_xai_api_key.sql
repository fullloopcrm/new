-- FullLoop's own prospect-qualification voice agent (xAI Grok). Stores the
-- xAI API key per tenant, same encrypted-at-rest pattern as
-- tenants.telnyx_api_key / tenants.stripe_api_key (023_missing_per_tenant_api_keys.sql):
-- plain TEXT column, encryptSecret()/decryptSecret() handle it in application code.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_api_key TEXT;
