-- 2026_07_18_service_types_photo_notes.sql
-- W1 (P1 schema lane) -- Master Catalog items (service_types /
-- src/app/dashboard/sales/CatalogTab.tsx) need a photo and an internal-only
-- notes field, separate from the existing customer-facing `description`
-- column (shown on proposals -- see _QuoteBuilder.tsx CatalogItem type,
-- which only reads id/name/description/price_cents/per_unit/item_type/
-- category from GET /api/catalog and never reads `notes`, so this stays
-- off proposals without any extra gating).
--
-- image_url mirrors the existing image-upload pattern used by
-- booking_notes.images / team_members.avatar_url -- a public Supabase
-- Storage URL from the shared POST /api/uploads endpoint (bucket
-- 'uploads', folder-scoped path). Single image, not an array, since this
-- is one product/catalog photo, not a gallery.
--
-- Additive-only, both nullable -- no backfill needed, no existing row
-- shape changes.

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN service_types.image_url IS
  'Public Supabase Storage URL for this catalog item''s photo, uploaded via POST /api/uploads (folder: catalog-items). NULL = no photo set.';

COMMENT ON COLUMN service_types.notes IS
  'Internal-only note, separate from the customer-facing `description` column. Never surfaced on proposals -- see _QuoteBuilder.tsx CatalogItem type, which does not read this column.';
