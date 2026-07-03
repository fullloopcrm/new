-- Catalog v2 (2026-07-03)
-- Simplifies the catalog item model: every item is one of three TYPES
-- (service / project / product) and is priced per hour or per job. Drops the
-- booking/sales `mode` concept from the item (the fork lives on the deal,
-- deals.mode). `service_types` is the single catalog table.
--
-- Additive + idempotent. Existing rows default to service / hour (they're
-- cleaning services), so the live booking funnel keeps working.

ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'service';
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS per_unit text NOT NULL DEFAULT 'hour';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_types_item_type_chk') THEN
    ALTER TABLE public.service_types
      ADD CONSTRAINT service_types_item_type_chk CHECK (item_type IN ('service', 'project', 'product'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_types_per_unit_chk') THEN
    ALTER TABLE public.service_types
      ADD CONSTRAINT service_types_per_unit_chk CHECK (per_unit IN ('hour', 'job'));
  END IF;
END $$;

-- The `mode` and `pricing_model` columns from catalog v1 are now unused
-- (deprecated). Left in place to avoid a destructive drop; the API/UI stop
-- reading them.
