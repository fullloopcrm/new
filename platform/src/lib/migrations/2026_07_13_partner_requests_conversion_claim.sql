-- TOCTOU fix: createTenantFromLead() used to guard duplicate tenant creation
-- with a plain select-then-branch on partner_requests.converted_tenant_id —
-- two concurrent callers (e.g. an admin double-clicking "convert" while a
-- paid-proposal webhook fires for the same lead) could both read
-- converted_tenant_id: null and both create a full duplicate tenant
-- (billing, seats, territory claim, owner PIN — the works) before either
-- write landed. This column is an atomic claim marker, set in one UPDATE
-- gated on both converted_tenant_id AND conversion_claimed_at being NULL —
-- the loser's UPDATE matches zero rows and backs off instead of proceeding.
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS conversion_claimed_at timestamptz;
