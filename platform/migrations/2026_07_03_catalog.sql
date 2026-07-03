-- Per-tenant Catalog (2026-07-03)
-- Turns service_types into a trade-agnostic service catalog and adds a
-- products table. This is where the booking-vs-sales FORK lives per service
-- (replacing the per-site funnel_mode): each service declares its own mode +
-- pricing model, so one tenant can run booking services and sales services
-- side by side.
--
-- Idempotent + additive. service_types has live rows (cleaning services); the
-- new columns default to booking/hourly so existing rows keep working.

-- 1) Extend service_types into the service catalog --------------------------
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'booking';
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS pricing_model text NOT NULL DEFAULT 'hourly';
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS price_cents integer;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_types_mode_chk') THEN
    ALTER TABLE public.service_types
      ADD CONSTRAINT service_types_mode_chk CHECK (mode IN ('booking', 'sales'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'service_types_pricing_chk') THEN
    ALTER TABLE public.service_types
      ADD CONSTRAINT service_types_pricing_chk CHECK (pricing_model IN ('hourly', 'flat', 'quote'));
  END IF;
END $$;

-- 2) Products (per-tenant goods / add-ons) ----------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  unit text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id, active, sort_order);
