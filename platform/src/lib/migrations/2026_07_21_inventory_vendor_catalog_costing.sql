-- 2026_07_21_inventory_vendor_catalog_costing.sql
-- Real inventory, tied to vendors (who supplies it, at what cost) and to
-- catalog items (what a service actually consumes), so the existing budget
-- engine (2026_07_18_quote_budgets.sql / src/lib/budget-template.ts) can be
-- fed real costs instead of a hand-typed service_types.cost_cents guess.
--
-- Four pieces:
--   1. inventory_items    -- physical stock: name, sku, unit, cost, on-hand.
--   2. vendor_items        -- which vendor(s) supply an item, at what cost
--                             (an item can have more than one vendor).
--   3. catalog_item_materials -- bill of materials: what a service_types row
--                             actually consumes per unit sold/booked.
--   4. expenses.vendor_id  -- real FK so job actuals tie back to a vendor,
--                             instead of the free-text vendor_name column.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_21_inventory_vendor_catalog_costing.sql

BEGIN;

CREATE TABLE IF NOT EXISTS inventory_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  sku                 text,
  category            text,
  unit_label          text NOT NULL DEFAULT 'unit',
  quantity_on_hand    numeric(12,2) NOT NULL DEFAULT 0,
  unit_cost_cents     integer NOT NULL DEFAULT 0,
  reorder_threshold   numeric(12,2),
  notes               text,
  active              boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_tenant_active ON inventory_items(tenant_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_tenant_sku ON inventory_items(tenant_id, sku) WHERE sku IS NOT NULL;

CREATE OR REPLACE FUNCTION inventory_items_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION inventory_items_set_updated_at();

-- Vendor <-> inventory item linking. An item can be supplied by more than one
-- vendor at different prices; is_preferred marks which one to default to when
-- costing (budget template) or ordering.
CREATE TABLE IF NOT EXISTS vendor_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vendor_id           uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  inventory_item_id   uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  unit_cost_cents     integer NOT NULL DEFAULT 0,
  lead_time_days      integer,
  is_preferred        boolean NOT NULL DEFAULT false,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_items_vendor_item ON vendor_items(vendor_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_tenant ON vendor_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_items_item ON vendor_items(inventory_item_id);

-- Only one preferred vendor per item.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_items_one_preferred
  ON vendor_items(inventory_item_id) WHERE is_preferred;

CREATE OR REPLACE FUNCTION vendor_items_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_items_updated_at ON vendor_items;
CREATE TRIGGER trg_vendor_items_updated_at
  BEFORE UPDATE ON vendor_items
  FOR EACH ROW EXECUTE FUNCTION vendor_items_set_updated_at();

-- Bill of materials: what a catalog item (service_types row) actually
-- consumes per unit sold/booked. qty_per_unit is per one unit of the
-- service's own per_unit (per hour, per job, per sqft, etc.) -- e.g. "Sod
-- Install" (per_unit='job') consumes 40 sqft of sod per job.
CREATE TABLE IF NOT EXISTS catalog_item_materials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_type_id     uuid NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  inventory_item_id   uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  qty_per_unit        numeric(12,2) NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_item_materials_pair ON catalog_item_materials(service_type_id, inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_item_materials_tenant ON catalog_item_materials(tenant_id);

CREATE OR REPLACE FUNCTION catalog_item_materials_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_catalog_item_materials_updated_at ON catalog_item_materials;
CREATE TRIGGER trg_catalog_item_materials_updated_at
  BEFORE UPDATE ON catalog_item_materials
  FOR EACH ROW EXECUTE FUNCTION catalog_item_materials_set_updated_at();

-- Real vendor FK on expenses (job actuals), additive alongside the existing
-- free-text vendor_name -- keeps old rows displaying correctly, new rows can
-- carry both until every entry path is updated to use the picker.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_id) WHERE vendor_id IS NOT NULL;

COMMIT;
