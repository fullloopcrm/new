-- Adopted from legacy hand-run migration: 2026_07_19_tenants_deepgram_api_key.sql
-- Original commit date (git first-add): 2026-07-19T19:18:06-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Per-tenant Deepgram key, mirroring anthropic_api_key: tenant's own key if
-- set, else the platform-billed key. Encrypted at rest via encryptTenantSecrets()
-- (added to ENCRYPTED_TENANT_FIELDS in secret-crypto.ts) — never store plaintext.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deepgram_api_key TEXT;
