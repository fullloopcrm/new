-- Adopted from legacy hand-run migration: 2026_07_21_budget_line_items_description_price_margin.sql
-- Original commit date (git first-add): 2026-07-21T15:29:17-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 2026_07_21_budget_line_items_description_price_margin.sql
-- Line-item row redesign: a real free-text description separate from the
-- catalog item's own name, a per-line unit price editable independent of
-- qty, and a per-line target gross margin (the template-level
-- target_margin_bps is an overall goal; this is "what margin do I want on
-- THIS specific line" -- materials might run thin, labor might run rich).
--
-- unit_price_cents seeds from the linked catalog item's cost_cents when
-- picked but stays editable per line (e.g. a vendor's price moved since the
-- catalog was last updated). budgeted_cents / total stays qty * unit_price,
-- computed client-side and stored as before so every existing consumer of
-- budgeted_cents (rollups, quote totals) keeps working unchanged.

ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS unit_price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS margin_bps integer;

ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS unit_price_cents integer NOT NULL DEFAULT 0;
ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS margin_bps integer;

-- Backfill unit_price_cents for existing rows from budgeted_cents / qty so
-- pre-existing lines don't show a $0 unit price after this migration.
UPDATE budget_template_line_items SET unit_price_cents = ROUND(budgeted_cents / GREATEST(qty, 1)) WHERE unit_price_cents = 0 AND budgeted_cents > 0;
UPDATE budget_line_items SET unit_price_cents = ROUND(budgeted_cents / GREATEST(qty, 1)) WHERE unit_price_cents = 0 AND budgeted_cents > 0;
