-- Sales spine: link a lead (partner_requests) to the tenant it became.
-- Set when an admin clicks "Convert to tenant" in Sales → Leads (Sold/Onboarded).
-- Lets the pipeline show "already a tenant" and prevents double-conversion.
ALTER TABLE partner_requests
  ADD COLUMN IF NOT EXISTS converted_tenant_id UUID REFERENCES tenants(id);

CREATE INDEX IF NOT EXISTS idx_partner_requests_converted_tenant
  ON partner_requests(converted_tenant_id)
  WHERE converted_tenant_id IS NOT NULL;
