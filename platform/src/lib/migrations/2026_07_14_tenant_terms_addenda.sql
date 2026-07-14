-- Per-tenant Terms of Service addenda (P6).
--
-- FILE-ONLY. Not applied to any database. Requires Jeff's approval + the
-- leader to run this against prod. Do not run this migration yourself.
--
-- Full Loop CRM's platform-wide Terms of Service (src/app/(marketing)/terms)
-- covers the standard partnership agreement. Some partners negotiate
-- individual overrides (custom pricing, extended trial, bespoke clauses).
-- Rather than forking the terms page per tenant, this table lets an admin
-- attach a scoped addendum that renders alongside the base terms ONLY when
-- that specific tenant is the one viewing the page (resolved server-side via
-- getCurrentTenant() — signed tenant-domain header, admin impersonation, or
-- Clerk membership — never client-supplied).
--
-- Only one addendum is "active" per tenant at a time; superseding an
-- addendum means inserting a new row and flipping the old one to
-- active=false rather than mutating history in place.

CREATE TABLE IF NOT EXISTS tenant_terms_addenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  monthly_rate_override NUMERIC,
  setup_fee_override NUMERIC,
  custom_clauses TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_terms_addenda_tenant
  ON tenant_terms_addenda(tenant_id, active);

-- At most one active addendum per tenant — supersede by deactivating the
-- old row and inserting a new one, not by having two live at once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_terms_addenda_one_active
  ON tenant_terms_addenda(tenant_id) WHERE active = true;
