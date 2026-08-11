-- 20260811204500_dropship_variant_sku_linkage.sql
--
-- service_types.dropship_external_sku/dropship_external_variant_id are
-- product-row-level, but a product can have multiple color/size variants
-- (color_options/size_options). Without this, every variant of a product
-- dispatches to the same supplier SKU regardless of which one the customer
-- actually ordered.
--
-- dropship_variant_skus maps "<color>|<size>" -> {externalSku, externalVariantId}
-- per product. Empty ('{}') for non-variant products, which keep using the
-- product-level dropship_external_sku/dropship_external_variant_id as-is
-- (the dispatch route falls back to those when no variant key matches).
ALTER TABLE service_types ADD COLUMN IF NOT EXISTS dropship_variant_skus jsonb NOT NULL DEFAULT '{}';

ALTER TABLE shop_order_items ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE shop_order_items ADD COLUMN IF NOT EXISTS size text;
