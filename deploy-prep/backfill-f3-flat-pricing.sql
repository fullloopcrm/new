-- deploy-prep/backfill-f3-flat-pricing.sql
-- =====================================================================
-- GATED PREP for CORE-PROCESS F3 (LEADER 18:58 queue item a):
--   Code fix ca6ee782 (already on p1-w2, merged pre-existing) made
--   provision-tenant seed dumpster/junk_removal/bin_cleaning/pet_waste/
--   snow_removal/laundry/fitness service_types with pricing_model='flat'
--   going forward. Tenants provisioned BEFORE that fix landed still have
--   pricing_model IS NULL (checkout/invoice default NULL -> 'hourly',
--   see team-portal/checkout/route.ts:53) and per_unit='hour' on those
--   rows, so e.g. a dumpster "10-Yard Dumpster" ($350, 1hr default
--   duration) still bills 1h x $350 = correct by accident at 1hr, but
--   any edited/duration-drifted row or the true bug case (multi-hour
--   default_duration_hours trades like junk_removal's Half/Full Truckload
--   at 2h/3h) bills hours x rate instead of the flat $150/$175.
--
-- SAFETY MODEL (same shape as e2e-tenant-cleanup.sql):
--   STEP 1  = read-only. Materialize the target rows behind a guard that
--             requires BOTH (a) tenants.industry free-text matches the
--             same regex mapIndustry() uses for these 7 verticals, AND
--             (b) service_types.name + default_hourly_rate exactly match
--             a known SERVICE_PRESETS entry for that trade, AND
--             (c) pricing_model IS NULL AND per_unit = 'hour' (the bug
--             signature — anything an operator already touched has moved
--             off this exact combination and is left alone).
--   STEP 2  = the UPDATE, COMMENTED OUT. Run only after STEP 1's row
--             count and eyeball check look right.
--   STEP 3  = re-verify zero rows match the guard afterwards.
--
-- NOTHING IN THIS FILE IS EXECUTED BY AUTHORING IT. A human runs it,
-- reads STEP 1, then (only if the target set looks right) uncomments
-- STEP 2 and re-runs STEP 3. Run STEP 1 and STEP 2 in the SAME psql
-- session (STEP 2 targets the temp table built in STEP 1).
-- =====================================================================

-- ---------------------------------------------------------------------
-- STEP 1 — build + inspect the target set (read-only)
-- ---------------------------------------------------------------------
CREATE TEMP TABLE f3_backfill_targets AS
SELECT st.id, st.tenant_id, t.industry, st.name, st.default_hourly_rate,
       st.pricing_model, st.per_unit,
       CASE
         WHEN t.industry ~* '(trash ?bin|garbage ?can|bin clean)' THEN 'visit'  -- bin_cleaning
         WHEN t.industry ~* '(pet ?waste|dog ?waste|poop|pooper)' THEN 'visit'  -- pet_waste
         WHEN t.industry ~* '(dumpster|roll ?off|container rental)' THEN 'job'  -- dumpster
         WHEN t.industry ~* '(junk|debris|\yhaul|cleanout)' THEN 'job'          -- junk_removal
         WHEN t.industry ~* '(snow|plow|de-?ice|ice removal)' THEN 'visit'      -- snow_removal
         WHEN t.industry ~* '(laundry|wash.*fold|dry ?clean|linen)' THEN 'job'  -- laundry
         WHEN t.industry ~* '(fitness|trainer|\ygym\y|personal train|\yyoga\y|pilates)' THEN 'visit' -- fitness
       END AS target_per_unit
FROM service_types st
JOIN tenants t ON t.id = st.tenant_id
WHERE st.pricing_model IS NULL
  AND st.per_unit = 'hour'
  AND (
    -- dumpster
    (t.industry ~* '(dumpster|roll ?off|container rental)' AND (st.name, st.default_hourly_rate) IN (
      ('10-Yard Dumpster', 350), ('20-Yard Dumpster', 450),
      ('30-Yard Dumpster', 550), ('40-Yard Dumpster', 650)))
    OR
    -- junk_removal
    (t.industry ~* '(junk|debris|\yhaul|cleanout)' AND (st.name, st.default_hourly_rate) IN (
      ('Single Item Pickup', 95), ('Quarter Truckload', 125), ('Half Truckload', 150),
      ('Full Truckload', 175), ('Estate / Property Cleanout', 150)))
    OR
    -- bin_cleaning
    (t.industry ~* '(trash ?bin|garbage ?can|bin clean)' AND (st.name, st.default_hourly_rate) IN (
      ('Single Bin Cleaning', 25), ('Two-Bin Service', 40),
      ('Monthly Plan (per visit)', 20), ('Commercial Bins', 95)))
    OR
    -- pet_waste
    (t.industry ~* '(pet ?waste|dog ?waste|poop|pooper)' AND (st.name, st.default_hourly_rate) IN (
      ('Weekly Yard Cleanup', 20), ('Twice-Weekly Service', 35),
      ('One-Time Cleanup', 65), ('Commercial / HOA', 95)))
    OR
    -- snow_removal
    (t.industry ~* '(snow|plow|de-?ice|ice removal)' AND (st.name, st.default_hourly_rate) IN (
      ('Per-Visit Plow', 75), ('Seasonal Contract (per visit)', 65),
      ('Salting / De-Ice', 55), ('Sidewalk & Walkways', 60)))
    OR
    -- laundry
    (t.industry ~* '(laundry|wash.*fold|dry ?clean|linen)' AND (st.name, st.default_hourly_rate) IN (
      ('Wash & Fold', 40), ('Pickup & Delivery', 45),
      ('Dry Cleaning', 55), ('Commercial / Bulk', 40)))
    OR
    -- fitness
    (t.industry ~* '(fitness|trainer|\ygym\y|personal train|\yyoga\y|pilates)' AND (st.name, st.default_hourly_rate) IN (
      ('Intro Session', 60), ('Single Session', 90),
      ('Monthly Package', 80), ('In-Home Session', 110)))
  );

-- Inspect before touching anything:
SELECT target_per_unit, industry, name, default_hourly_rate, pricing_model, per_unit, count(*)
FROM f3_backfill_targets
GROUP BY 1, 2, 3, 4, 5, 6
ORDER BY 1, 2, 3;

SELECT count(*) AS total_targets FROM f3_backfill_targets;

-- ---------------------------------------------------------------------
-- STEP 2 — the fix (COMMENTED OUT — uncomment + run only after STEP 1
-- looks right, in the same session)
-- ---------------------------------------------------------------------
-- UPDATE service_types st
-- SET pricing_model = 'flat',
--     per_unit = f.target_per_unit
-- FROM f3_backfill_targets f
-- WHERE st.id = f.id;

-- ---------------------------------------------------------------------
-- STEP 3 — re-verify zero rows still match the bug signature for the
-- tenants just fixed
-- ---------------------------------------------------------------------
-- SELECT count(*) FROM service_types st
-- JOIN f3_backfill_targets f ON f.id = st.id
-- WHERE st.pricing_model IS NULL AND st.per_unit = 'hour';
-- -- expect 0
