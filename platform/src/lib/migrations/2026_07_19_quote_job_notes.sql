-- Proposals: split the single free-text "description" field into two
-- concerns. Description auto-presets from the catalog item's own
-- description when a line item is added from the catalog (generic scope of
-- work), while job_notes holds proposal-specific / job-related detail the
-- tenant adds on top -- so typing job notes never overwrites the preset
-- catalog description. Both are client-facing (shown on the public quote
-- page), unlike the existing internal-only `notes` column.
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS job_notes TEXT;
