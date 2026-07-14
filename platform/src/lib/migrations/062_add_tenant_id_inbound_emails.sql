-- Migration 062: scope inbound_emails to a tenant
--
-- The Resend inbound webhook (email.received) inserted into inbound_emails with
-- NO tenant_id — an UNSCOPED, globally-visible row (cross-tenant leak). The
-- webhook now resolves the tenant from the recipient (To) address and sets
-- tenant_id; this adds the column it writes to. Additive + idempotent.
--
-- NOTE: inbound_emails' CREATE TABLE is not tracked in this repo's migrations
-- (it was applied out-of-band on the live DB), so this uses IF NOT EXISTS and
-- does not assume the column is absent.

ALTER TABLE inbound_emails
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS idx_inbound_emails_tenant
  ON inbound_emails(tenant_id);

-- BACKFILL NOTE (run manually after review — do NOT auto-run in this migration):
-- Existing rows predate scoping and have tenant_id = NULL. There is no reliable
-- automatic backfill because the same resolution the app uses lives in
-- application code (email_from -> resend_domain -> tenants.domain/tenant_domains).
-- A best-effort SQL backfill by recipient domain against tenants.resend_domain:
--
--   UPDATE inbound_emails ie
--   SET tenant_id = t.id
--   FROM tenants t
--   WHERE ie.tenant_id IS NULL
--     AND ie.to_address IS NOT NULL
--     AND lower(split_part(regexp_replace(ie.to_address, '.*<|>.*', '', 'g'), '@', 2))
--         = lower(t.resend_domain);
--
-- Rows that still resolve to NULL after backfill should be treated as unscoped
-- and NOT surfaced in any tenant's admin inbox. Consider deleting or quarantining
-- them once the inbox reader filters on tenant_id.
