-- Per-tenant Deepgram key, mirroring anthropic_api_key: tenant's own key if
-- set, else the platform-billed key. Encrypted at rest via encryptTenantSecrets()
-- (added to ENCRYPTED_TENANT_FIELDS in secret-crypto.ts) — never store plaintext.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deepgram_api_key TEXT;
