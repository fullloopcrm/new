-- 2026_07_21_budget_line_items.sql
-- Replaces quote_budgets' 3 fixed cost buckets (labor/materials/other) with
-- an open list of line items, each optionally tagged to the shared
-- categories tree (2026_07_21_shared_categories.sql). The fixed 3-bucket
-- model fit service/project fine but never fit equipment (a rental's real
-- cost is depreciation + maintenance + delivery, not "labor hours") --
-- tenants need to add their own line ("Permit Fees", "Equipment
-- Depreciation Allocation") instead of stuffing everything into "Other".
--
-- `kind` is kept as a loose grouping for display/legacy compatibility
-- (labor/materials/other/custom) but a line item's real identity is its
-- label + category, not its kind.
--
-- Backfills the two existing quote_budgets rows into line items, then drops
-- the 6 old fixed columns -- verified count before running.

BEGIN;

CREATE TABLE IF NOT EXISTS budget_line_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_budget_id   uuid NOT NULL REFERENCES quote_budgets(id) ON DELETE CASCADE,
  category_id       uuid REFERENCES categories(id) ON DELETE SET NULL,
  label             text NOT NULL,
  kind              text NOT NULL DEFAULT 'other' CHECK (kind IN ('labor', 'materials', 'other')),
  budgeted_cents    integer NOT NULL DEFAULT 0,
  actual_cents      integer NOT NULL DEFAULT 0,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_budget ON budget_line_items(quote_budget_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_budget_line_items_tenant ON budget_line_items(tenant_id);

CREATE OR REPLACE FUNCTION budget_line_items_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_line_items_updated_at ON budget_line_items;
CREATE TRIGGER trg_budget_line_items_updated_at
  BEFORE UPDATE ON budget_line_items
  FOR EACH ROW EXECUTE FUNCTION budget_line_items_set_updated_at();

-- Backfill: every existing quote_budgets row becomes up to 3 line items,
-- preserving its exact prior values.
INSERT INTO budget_line_items (tenant_id, quote_budget_id, label, kind, budgeted_cents, actual_cents, sort_order)
SELECT tenant_id, id, 'Labor', 'labor', labor_budget_cents, labor_actual_cents, 0 FROM quote_budgets
UNION ALL
SELECT tenant_id, id, 'Materials & Supplies', 'materials', materials_budget_cents, materials_actual_cents, 1 FROM quote_budgets
UNION ALL
SELECT tenant_id, id, 'Other', 'other', other_budget_cents, other_actual_cents, 2 FROM quote_budgets;

ALTER TABLE quote_budgets DROP COLUMN IF EXISTS labor_budget_cents;
ALTER TABLE quote_budgets DROP COLUMN IF EXISTS materials_budget_cents;
ALTER TABLE quote_budgets DROP COLUMN IF EXISTS other_budget_cents;
ALTER TABLE quote_budgets DROP COLUMN IF EXISTS labor_actual_cents;
ALTER TABLE quote_budgets DROP COLUMN IF EXISTS materials_actual_cents;
ALTER TABLE quote_budgets DROP COLUMN IF EXISTS other_actual_cents;

COMMIT;
