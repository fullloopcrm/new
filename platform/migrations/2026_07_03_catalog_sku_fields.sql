-- Catalog SKU fields (2026-07-03)
-- A catalog item (service | project | product) must cover all trades. Beyond
-- name/description/price we add: a real unit of measure (+ custom label),
-- minimum charge, taxable flag, cost (for margin), and a category for grouping.
-- default_duration_hours already exists (feeds the schedule window). Idempotent.
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS unit_label text,                      -- free-text unit when per_unit='custom' (e.g. 'per window')
  ADD COLUMN IF NOT EXISTS min_charge_cents integer,            -- trip fee / minimum (e.g. 2-hr minimum)
  ADD COLUMN IF NOT EXISTS taxable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cost_cents integer,                  -- your cost, for margin
  ADD COLUMN IF NOT EXISTS category text;                       -- grouping in the picker

-- Expand the unit of measure to cover all trades.
ALTER TABLE public.service_types DROP CONSTRAINT IF EXISTS service_types_per_unit_chk;
ALTER TABLE public.service_types
  ADD CONSTRAINT service_types_per_unit_chk
  CHECK (per_unit IN ('hour', 'job', 'unit', 'sqft', 'linear_ft', 'visit', 'day', 'custom'));
