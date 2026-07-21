-- 2026_07_21_budget_line_items_catalog_link.sql
-- Link budget line items to a real catalog item (service_types) instead of
-- a free-text label -- so a line's category comes from the catalog item's
-- own category (fixing the "Other, no category" problem bookkeepers hate)
-- rather than being retyped and miscategorized by hand each time.
-- label/category_id stay as columns (denormalized copy at save time) so
-- existing rows and free-text fallback still render; category_id is
-- overwritten from the catalog item's category_id whenever service_type_id
-- is set.

ALTER TABLE budget_line_items ADD COLUMN IF NOT EXISTS service_type_id uuid REFERENCES service_types(id) ON DELETE SET NULL;
ALTER TABLE budget_template_line_items ADD COLUMN IF NOT EXISTS service_type_id uuid REFERENCES service_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_budget_line_items_service_type ON budget_line_items(service_type_id) WHERE service_type_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budget_template_line_items_service_type ON budget_template_line_items(service_type_id) WHERE service_type_id IS NOT NULL;
