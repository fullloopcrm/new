-- 2026_07_21_shared_categories.sql
-- One tenant-defined category tree, shared across Catalog, Vendors, and
-- Inventory (previously three disconnected free-text `category` columns).
-- Mirrors the parent_id hierarchy pattern chart_of_accounts already uses.
--
-- Each category can optionally point at a default chart-of-accounts revenue
-- account (for catalog items -- what GL bucket does selling this post to)
-- and/or COGS account (for inventory/vendor items -- what GL bucket does
-- buying/consuming this post to), so tagging an item with a category tells
-- the system which ledger account it belongs in instead of a bookkeeper
-- reconciling it by hand later.
--
-- Existing `category` text columns on service_types/vendors/inventory_items
-- are left in place as a display fallback for old rows; category_id is
-- additive, same pattern as expenses.vendor_id alongside vendor_name.

BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  parent_id                   uuid REFERENCES categories(id) ON DELETE SET NULL,
  default_revenue_account_id  uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  default_cogs_account_id     uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  active                      boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Unique name within the same parent scope (top-level names unique among
-- top-level, sub-names unique within their parent) -- coalesce so the unique
-- index applies even when parent_id is null.
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_tenant_parent_name
  ON categories(tenant_id, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
CREATE INDEX IF NOT EXISTS idx_categories_tenant_active ON categories(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE OR REPLACE FUNCTION categories_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION categories_set_updated_at();

-- Additive FK columns, existing text columns untouched.
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_types_category ON service_types(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id) WHERE category_id IS NOT NULL;

COMMIT;
