-- 2026_07_21_budget_line_items_qty.sql
-- Quantity per line item (e.g. 3 bags of fertilizer), multiplied against
-- the linked catalog item's unit cost to get budgeted_cents.

ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS qty numeric(12,2) NOT NULL DEFAULT 1;
ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS qty numeric(12,2) NOT NULL DEFAULT 1;
