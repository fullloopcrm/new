-- Per-service-type budget TEMPLATE defaults, so a new quote_budgets row for
-- a service can pre-fill instead of starting blank (see
-- 2026_07_18_quote_budgets.sql for the per-quote budget itself).
--
-- WHAT WE REUSE (checked before adding columns, per leader instruction):
--   - service_types.cost_cents already exists (per-item internal cost, used
--     today for per-SKU margin on the Master Catalog page). We reuse it
--     directly as the per-unit MATERIALS estimate — no new column.
--   - service_types.default_duration_hours already exists (booking duration
--     estimate). We reuse it as the per-unit LABOR HOURS estimate — the time
--     to deliver one unit of this service is the same number whether you're
--     scheduling it or costing it.
--   - service_types.default_hourly_rate is NOT reused for the labor cost
--     rate below: that column is the CUSTOMER-FACING price rate charged for
--     legacy hourly-priced services (see src/app/api/portal/bookings/route.ts,
--     src/lib/tenant-site.ts). Reusing it for an internal cost rate would
--     silently conflate revenue and cost. A genuinely new column is needed.
--
-- WHAT'S NEW:
--   - default_labor_rate_cents: internal labor cost per hour (cents), paired
--     with default_duration_hours to derive a labor budget.
--   - default_overhead_cents: flat per-unit overhead estimate (cents) —
--     equipment, permits, subcontractor markup, etc. that isn't labor or
--     materials.
--   - default_target_margin_bps: this service type's usual target margin
--     (basis points, 3500 = 35%), so quotes built mostly from one service
--     type inherit a sensible target instead of an empty field.
--
-- All nullable, all additive. NULL means "no template set for this item" —
-- the suggestion logic (src/lib/budget-template.ts) treats a NULL rate/hours
-- pair as "can't suggest labor for this line," not as zero.

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS default_labor_rate_cents INTEGER;

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS default_overhead_cents INTEGER;

ALTER TABLE service_types
  ADD COLUMN IF NOT EXISTS default_target_margin_bps INTEGER;

COMMENT ON COLUMN service_types.default_labor_rate_cents IS
  'Internal labor cost per hour (cents), used with default_duration_hours to derive a suggested per-unit labor budget on new quotes. Distinct from default_hourly_rate, which is the customer-facing price. NULL = no labor template for this item.';

COMMENT ON COLUMN service_types.default_overhead_cents IS
  'Flat per-unit overhead cost estimate (cents) -- equipment, permits, subcontractor markup, etc. NULL = no overhead template for this item.';

COMMENT ON COLUMN service_types.default_target_margin_bps IS
  'This service type''s usual target margin in basis points (3500 = 35%), used to pre-fill quote_budgets.target_margin_bps. NULL = no default set.';
