-- "Starting at" price flag for catalog items (2026-08-02)
--
-- service_types already has min_charge_cents (a separate concept -- a
-- floor/trip-fee minimum charge). This is different: a boolean marking
-- whether the displayed price_cents is a fixed price or a "starting at"
-- minimum, for quote/booking/site display ("Starting at $99" vs "$99").
-- Requested from onboarding's Services & Pricing step (OnboardingCatalog.tsx)
-- but applies to every catalog item, not just onboarding-created ones.
alter table service_types
  add column if not exists price_is_starting boolean not null default false;

comment on column service_types.price_is_starting is
  'True if price_cents is a minimum/starting price to display as "Starting at $X" rather than a fixed price.';
