-- Per-tenant admin login PINs.
--
-- Adds a hashed admin-login PIN to each tenant_member so operators log in at
-- <tenant-domain>/fullloop with their OWN PIN instead of one shared global PIN.
-- PIN is stored HMAC-SHA256-hashed (keyed by ADMIN_TOKEN_SECRET) — never plaintext.
-- A member with a pin_hash can authenticate to that tenant's Loop; the minted
-- token is bound to (tenant_id, member id) so it is useless on another tenant.
--
-- Additive + reversible. Safe to run while the global ADMIN_PIN path keeps working.

ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS pin_hash    text;
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS pin_set_at  timestamptz;
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS pin_last_login timestamptz;

-- A given PIN may exist at most once per tenant (prevents two members colliding
-- on the same PIN, which would make login ambiguous). Partial: only enforced
-- where a PIN is actually set.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_members_tenant_pinhash
  ON tenant_members (tenant_id, pin_hash)
  WHERE pin_hash IS NOT NULL;
</content>
