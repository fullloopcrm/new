-- 2026_07_16_sqft_tier_pricing.sql
-- W1 (P1 schema lane) — lawn-care sqft-tier pricing gap.
--
-- WHY: lawn_care/landscaping service_types are flat- or hourly-priced today
-- (pricing_model 'hourly' | 'flat' | 'quote' — see settings/page.tsx
-- PRICING_MODELS) regardless of the property's actual lot size. A 2,000 sqft
-- postage-stamp yard and a 20,000 sqft estate get charged the same flat rate
-- for "Mowing & Trim," which is not how any real lawn-care/landscaping
-- business prices — every competitor prices by lot size tier. There is also
-- nowhere in the schema to even record a property's square footage
-- (client_properties has address/unit/lat/lng only — verified against
-- 052_client_properties.sql, the table's only CREATE/ALTER).
--
-- Additive-only: one new pricing_model value ('sqft_tiered', enforced at the
-- application layer like the existing pricing_model values — there has never
-- been a DB CHECK constraint on this column, confirmed by grepping every
-- migration file) plus two new nullable columns. Nothing existing changes
-- shape; every current pricing_model ('hourly'/'flat'/'quote') is untouched.
--
-- Tier shape (src/lib/sqft-pricing.ts is the validator + resolver):
--   service_types.sqft_tiers = [{ "max_sqft": 5000, "price_cents": 5500 },
--                                { "max_sqft": 10000, "price_cents": 7500 },
--                                { "max_sqft": null, "price_cents": 9500 }]
-- Ascending by max_sqft; a trailing {max_sqft:null} tier is the uncapped
-- catch-all for anything larger than the last bounded tier.

alter table service_types
  add column if not exists sqft_tiers jsonb;

alter table client_properties
  add column if not exists lot_size_sqft integer;

-- Guard against a negative/zero sqft slipping in from a bad import or manual
-- edit (NULL — "unknown" — stays allowed; that's the "no lot size on file
-- yet" case the resolver already falls back on).
alter table client_properties
  drop constraint if exists client_properties_lot_size_sqft_positive;
alter table client_properties
  add constraint client_properties_lot_size_sqft_positive
  check (lot_size_sqft is null or lot_size_sqft > 0);
