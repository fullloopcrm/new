-- 2026_07_19_sales_partner_w9.sql
-- Encrypted W-9 (or W-8BEN for non-US) tax-form collection for Commission
-- Sales Partners (nycmaid ref 072ceed0). Depends on
-- src/lib/migrations/2026_07_18_sales_partners.sql (sales_partners table)
-- landing first.
--
-- Every field that identifies the partner for tax purposes (legal name,
-- business name, address, TIN) is stored as ONE opaque encrypted envelope
-- (src/lib/w9-crypto.ts, AES-256-GCM via src/lib/secret-crypto.ts's
-- SECRET_ENCRYPTION_KEY -- same key already used for tenant vendor secrets,
-- no new crypto/key introduced). Only a last-4 TIN digest is kept in the
-- clear, purely so admin can eyeball "is this the SSN/EIN I expect" without
-- decrypting the full record.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_19_sales_partner_w9.sql

BEGIN;

CREATE TABLE IF NOT EXISTS sales_partner_w9 (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_partner_id    uuid NOT NULL REFERENCES sales_partners(id) ON DELETE CASCADE,
  tax_classification  text NOT NULL CHECK (tax_classification IN
                         ('individual', 'sole_proprietor', 'llc', 'c_corp', 's_corp', 'partnership', 'other')),
  tin_type            text NOT NULL CHECK (tin_type IN ('ssn', 'ein')),
  tin_last4           text NOT NULL,           -- clear-text last 4 digits only, for admin eyeball-match
  encrypted_data       text NOT NULL,          -- AES-256-GCM envelope: legal_name, business_name, address, full TIN
  status              text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified', 'rejected')),
  submitted_at        timestamptz NOT NULL DEFAULT now(),
  verified_at         timestamptz,
  verified_by         text,                    -- tenant-session userId (Clerk id or PIN-admin id) of the verifying admin
  rejected_reason     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- One current W-9 per partner; a re-submission after 'rejected' replaces
  -- the row rather than accumulating stale copies of sensitive tax data.
  CONSTRAINT sales_partner_w9_partner_unique UNIQUE (sales_partner_id)
);

CREATE INDEX IF NOT EXISTS idx_sales_partner_w9_tenant ON sales_partner_w9(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_partner_w9_status ON sales_partner_w9(tenant_id, status);

COMMIT;
