-- 2026_08_09_service_types_color_size_options.sql
-- Selectable color/size options for Shop products (item_type='product').
-- Not a full priced-variant matrix -- these are just the choices shown on
-- the product page; price and fulfillment stay at the product-row level
-- until per-variant dropship linkage is built.

ALTER TABLE service_types ADD COLUMN IF NOT EXISTS color_options text[] NOT NULL DEFAULT '{}';
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS size_options text[] NOT NULL DEFAULT '{}';
