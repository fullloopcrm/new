-- Adopted from legacy hand-run migration: 2026_07_15_tenants_xai_api_key.sql
-- Original commit date (git first-add): 2026-07-20T20:20:40-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- FullLoop's own prospect-qualification voice agent (xAI Grok). Stores the
-- xAI API key per tenant, same encrypted-at-rest pattern as
-- tenants.telnyx_api_key / tenants.stripe_api_key (023_missing_per_tenant_api_keys.sql):
-- plain TEXT column, encryptSecret()/decryptSecret() handle it in application code.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS xai_api_key TEXT;
