-- 2026_07_21_expenses_fk_wiring.sql
-- Job expenses (the crew's actual-cost receipts) had no real link to a
-- vendor, a catalog item, or a budget line -- vendor_name/category were
-- free text, so logging a $200 mulch receipt never moved the matching
-- budget line's actual_cents. vendor_id already existed on this table but
-- the API never used it. Adding the two still-missing links plus
-- category_id so an expense can be tagged the same GL-linked way a budget
-- line already is.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS service_type_id uuid REFERENCES service_types(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS budget_line_item_id uuid REFERENCES budget_line_items(id) ON DELETE SET NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_budget_line_item ON expenses(budget_line_item_id) WHERE budget_line_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_service_type ON expenses(service_type_id) WHERE service_type_id IS NOT NULL;
