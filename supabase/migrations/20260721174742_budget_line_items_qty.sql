-- Adopted from legacy hand-run migration: 2026_07_21_budget_line_items_qty.sql
-- Original commit date (git first-add): 2026-07-21T13:47:41-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 2026_07_21_budget_line_items_qty.sql
-- Quantity per line item (e.g. 3 bags of fertilizer), multiplied against
-- the linked catalog item's unit cost to get budgeted_cents.

ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS qty numeric(12,2) NOT NULL DEFAULT 1;
ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS qty numeric(12,2) NOT NULL DEFAULT 1;
