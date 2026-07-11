-- Pricing-model backfill (2026-07-11)  [P1-2]
--
-- WHY: team-portal checkout (src/app/api/team-portal/checkout/route.ts) reads
-- service_types.pricing_model and, when it equals 'hourly', RECOMPUTES the
-- charge as elapsed-hours x hourly_rate x crew. For flat / per-unit trades
-- (dumpster rental, junk removal, trash-bin cleaning, pet-waste, snow, laundry,
-- personal training / fitness, etc.) the price is fixed at booking/quote time,
-- so an hourly recompute bills the customer WRONG.
--
-- ROOT CAUSE: catalog v2 (2026_07_03_catalog_v2.sql) made service_types.per_unit
-- the source of truth ('hour'|'job'|'unit'|'sqft'|'linear_ft'|'visit'|'day'|
-- 'custom') and marked pricing_model DEPRECATED for the UI/API — but checkout
-- still reads the v1 pricing_model, which DEFAULTS to 'hourly'. So any service
-- priced per a non-hour unit still gets billed hourly. This backfill
-- re-synchronizes pricing_model with the v2 truth.
--
-- pricing_model CHECK allows ('hourly','flat','quote'); per_unit CHECK allows
-- ('hour','job','unit','sqft','linear_ft','visit','day','custom').
--
-- AFFECTED-ROWS LOGIC (three idempotent passes; each pass only ever moves a
-- row OFF 'hourly', never back on, so re-running is a no-op):
--   PASS A  per_unit <> 'hour'      -> pricing_model = 'flat'   (service self-consistency)
--   PASS B  item_type = 'product'   -> pricing_model = 'flat'   (goods are never hourly)
--   PASS C  flat-trade tenants whose rows are still at the hour/hourly DEFAULT
--           -> per_unit = 'job', pricing_model = 'flat'         (industry safety net)
--
-- nycmaid (well-known UUID) is excluded everywhere: it is genuinely hourly
-- cleaning and its live checkout math must not change.

BEGIN;

-- PASS A — a service priced per a non-hour unit must not be billed hourly.
-- This is the precise, data-verifiable fix: it keys on the service's OWN unit,
-- not a guessed industry.
UPDATE service_types
SET pricing_model = 'flat'
WHERE pricing_model = 'hourly'
  AND per_unit IS NOT NULL
  AND per_unit <> 'hour';

-- PASS B — products (goods / add-ons) are inherently flat-priced.
UPDATE service_types
SET pricing_model = 'flat'
WHERE pricing_model = 'hourly'
  AND item_type = 'product';

-- PASS C — industry safety net. Catches flat-trade tenants whose service rows
-- were never migrated off the per_unit='hour' / pricing_model='hourly' DEFAULT
-- (so PASS A misses them). Only touches rows still at BOTH defaults, so a
-- deliberately-configured row is never clobbered by re-running.
--
-- ALLOWLIST maps the trades named in the P1-2 order to the CANONICAL industry
-- values that actually exist in the app's industry dropdowns
-- (admin/businesses/new + dashboard/settings):
--   junk        -> 'junk_removal'
--   snow        -> 'snow_removal'
--   fitness     -> 'personal_training'
--
-- >>> LEADER ACTION REQUIRED BEFORE PROD RUN <<<
-- The remaining named trades (dumpster, trash-bin cleaning, pet_waste, laundry)
-- are NOT canonical industry enum values in this app. If any live tenant runs
-- one of those, its tenants.industry is stored as free-text / 'other' / a slug
-- I cannot see from here. Run:  SELECT DISTINCT industry FROM tenants ORDER BY 1;
-- then add the real matching values to the IN (...) list below before running.
UPDATE service_types st
SET per_unit = 'job',
    pricing_model = 'flat'
WHERE st.pricing_model = 'hourly'
  AND (st.per_unit = 'hour' OR st.per_unit IS NULL)
  AND st.item_type IS DISTINCT FROM 'product'
  AND st.tenant_id IN (
    SELECT id FROM tenants
    WHERE id <> '00000000-0000-0000-0000-000000000001'::uuid
      AND industry IN (
        'junk_removal',
        'snow_removal',
        'personal_training'
        -- , '<dumpster industry value>'    -- confirm against live data
        -- , '<bin cleaning industry value>' -- confirm against live data
        -- , '<pet_waste industry value>'    -- confirm against live data
        -- , '<laundry industry value>'      -- confirm against live data
      )
  );

COMMIT;

-- DIAGNOSTIC — remaining 'hourly' services grouped by tenant industry. Eyeball
-- this for any flat-trade tenant still showing hourly rows (means its industry
-- value wasn't in the PASS C allowlist above).
SELECT t.industry,
       count(*) FILTER (WHERE st.pricing_model = 'hourly') AS still_hourly,
       count(*) FILTER (WHERE st.pricing_model = 'flat')   AS flat,
       count(*) FILTER (WHERE st.pricing_model = 'quote')  AS quote
FROM service_types st
JOIN tenants t ON t.id = st.tenant_id
WHERE t.id <> '00000000-0000-0000-0000-000000000001'::uuid
GROUP BY t.industry
ORDER BY still_hourly DESC, t.industry;
