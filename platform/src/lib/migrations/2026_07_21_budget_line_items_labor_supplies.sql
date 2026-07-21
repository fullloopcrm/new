-- 2026_07_21_budget_line_items_labor_supplies.sql
-- Replaces qty x single unit_price with two independent dollar fields per
-- line -- Labor Rate and Supplies Cost. A real proposal line ("Paint Living
-- Room") bundles both a labor cost and a materials cost under one named
-- scope; a catalog item is typed as either labor OR materials, never both,
-- so it can only ever seed a starting default for whichever field matches
-- its type -- the actual budget line needs both fields open regardless.
--
-- budgeted_cents (kept, still the source of truth other consumers read)
-- becomes labor_cents + supplies_cents instead of qty * unit_price_cents.
--
-- Also widens the `kind` check constraint to allow 'equipment' as its own
-- bucket -- a dumpster/equipment-rental business's whole budget was
-- otherwise falling into 'other', the exact catch-all Kind/Category exists
-- to avoid.

ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS labor_cents integer NOT NULL DEFAULT 0;
ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS supplies_cents integer NOT NULL DEFAULT 0;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS labor_cents integer NOT NULL DEFAULT 0;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS supplies_cents integer NOT NULL DEFAULT 0;

-- Backfill: best guess from the old unit_price_cents/qty math, using kind to
-- decide which bucket the existing dollar amount belongs in.
UPDATE budget_template_line_items SET labor_cents = budgeted_cents WHERE labor_cents = 0 AND supplies_cents = 0 AND kind = 'labor' AND budgeted_cents > 0;
UPDATE budget_template_line_items SET supplies_cents = budgeted_cents WHERE labor_cents = 0 AND supplies_cents = 0 AND kind != 'labor' AND budgeted_cents > 0;
UPDATE budget_line_items SET labor_cents = budgeted_cents WHERE labor_cents = 0 AND supplies_cents = 0 AND kind = 'labor' AND budgeted_cents > 0;
UPDATE budget_line_items SET supplies_cents = budgeted_cents WHERE labor_cents = 0 AND supplies_cents = 0 AND kind != 'labor' AND budgeted_cents > 0;

ALTER TABLE budget_template_line_items DROP CONSTRAINT IF EXISTS budget_template_line_items_kind_check;
ALTER TABLE budget_template_line_items ADD CONSTRAINT budget_template_line_items_kind_check CHECK (kind IN ('labor', 'materials', 'equipment', 'other'));
ALTER TABLE budget_line_items DROP CONSTRAINT IF EXISTS budget_line_items_kind_check;
ALTER TABLE budget_line_items ADD CONSTRAINT budget_line_items_kind_check CHECK (kind IN ('labor', 'materials', 'equipment', 'other'));
