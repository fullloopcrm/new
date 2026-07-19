-- Catalog Packages (2026-07-19)
-- A package bundles multiple existing Master Catalog items (services /
-- projects / products) under one package title + description. On a Proposal,
-- picking a package auto-fills the proposal title, description, and every
-- line item (each keeping the catalog item's own name + description) in one
-- action instead of the tenant building line items by hand.
--
-- Items are snapshotted -- [{ id, catalog_item_id, name, description,
-- quantity, unit_price_cents }] -- at package-build time, same convention as
-- quotes.line_items (src/lib/migrations/026_quotes.sql). Editing the source
-- catalog item later does not retroactively change a package that already
-- references it; the package must be re-built to pick up new pricing.
--
-- Additive + idempotent.

CREATE TABLE IF NOT EXISTS public.catalog_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_packages_tenant ON public.catalog_packages(tenant_id, active, sort_order);

CREATE OR REPLACE FUNCTION public.catalog_packages_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_catalog_packages_updated_at ON public.catalog_packages;
CREATE TRIGGER trg_catalog_packages_updated_at
  BEFORE UPDATE ON public.catalog_packages
  FOR EACH ROW EXECUTE FUNCTION public.catalog_packages_set_updated_at();
