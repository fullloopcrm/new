-- Pricing-model backfill (2026-07-11)  [P1-2]
--
-- WHY: team-portal checkout (src/app/api/team-portal/checkout/route.ts) reads
-- service_types.pricing_model and, when it equals 'hourly', RECOMPUTES the
-- charge as elapsed-hours x hourly_rate x crew (verified: route.ts line 40 defaults
-- pricingModel='hourly', line 86 `if (pricingModel === 'hourly')` runs the recompute).
-- For flat / per-unit trades (dumpster rental, trash-bin cleaning, pet-waste,
-- laundry / wash-&-fold, junk removal, snow, personal training / fitness) the price
-- is fixed at booking/quote time, so an hourly recompute bills the customer WRONG.
--
-- ROOT CAUSE: catalog v2 (2026_07_03_catalog_v2.sql) made service_types.per_unit
-- the source of truth and marked pricing_model DEPRECATED for the UI/API — but
-- checkout still reads the v1 pricing_model, which DEFAULTS to 'hourly'. On top of
-- that, industry-presets.ts seeds EVERY preset service at the per_unit='hour' /
-- pricing_model='hourly' default (svc() sets default_duration_hours/hourly_rate),
-- so even a dumpster or laundry tenant starts fully hourly. This backfill
-- re-synchronizes pricing_model with the v2 truth.
--
-- COLUMNS RE-VERIFIED against migrations/2026_07_03_catalog{,_v2,_sku_fields}.sql:
--   pricing_model  CHECK ('hourly','flat','quote')                       (catalog.sql)
--   item_type      CHECK ('service','project','product')                 (catalog_v2.sql)
--   per_unit       CHECK ('hour','job','unit','sqft','linear_ft',
--                         'visit','day','custom')                        (catalog_sku_fields.sql)
--
-- AFFECTED-ROWS LOGIC (four idempotent passes; each pass only ever moves a row
-- OFF 'hourly', never back on — pricing_model='hourly' is a predicate in every
-- pass — so re-running is a no-op):
--   PASS A  per_unit <> 'hour'        -> pricing_model = 'flat'   (service self-consistency)
--   PASS B  item_type = 'product'     -> pricing_model = 'flat'   (goods are never hourly)
--   PASS C  tenant is a flat-trade    -> per_unit='job', pricing_model='flat'
--           (industry detected via a FAITHFUL replica of mapIndustry — see below)
--   PASS D  the service ROW itself is an unmistakable flat service (dumpster,
--           wash-&-fold, bin cleaning, pet-waste) -> per_unit='job', pricing_model='flat'
--           (catches flat-trade tenants whose industry is 'other'/blank so PASS C
--            has no signal to match)
--
-- WHY PASS C IS A REGEX LADDER, NOT AN `industry IN (...)` ALLOWLIST:
-- The prior version matched three CANONICAL industry enum values
-- ('junk_removal','snow_removal','personal_training'). But dumpster, bin_cleaning,
-- pet_waste and laundry are NOT dropdown/enum values — they exist ONLY as internal
-- mapIndustry() keys and are stored in tenants.industry as free-text / 'other'
-- (e.g. "Dumpster Rental", "Wash & Fold", "Pooper Scooper Service"). An exact-enum
-- IN() list can never match those, so those four trades kept billing hourly.
-- The app's OWN source of truth for "what trade is this tenant" is
-- src/lib/industry-presets.ts `mapIndustry(raw)`: a first-match regex ladder over
-- the free-text industry string. PASS C reproduces that ladder EXACTLY (same rules,
-- same order) as a CASE, returning true only when the FIRST-matching rule is one of
-- the seven flat trades. Reproducing the full ladder (not just the seven target
-- regexes) is required so an earlier, higher-precedence rule still wins — e.g.
-- "pool cleanout" maps to pool (line 65), NOT junk (line 76), and must stay hourly.
--
-- nycmaid (well-known UUID) is excluded from PASS C/D: it is genuinely hourly
-- cleaning and its live checkout math must not change.

BEGIN;

-- PASS A — a service priced per a non-hour unit must not be billed hourly.
-- The precise, data-verifiable fix: it keys on the service's OWN unit.
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

-- PASS C — flat-trade tenants, detected by a FAITHFUL replica of
-- src/lib/industry-presets.ts mapIndustry(). Only touches rows still at BOTH
-- defaults (per_unit hour/null AND pricing_model hourly), so a deliberately
-- configured row is never clobbered, and re-running is a no-op.
UPDATE service_types st
SET per_unit = 'job',
    pricing_model = 'flat'
FROM tenants t
WHERE st.tenant_id = t.id
  AND st.pricing_model = 'hourly'
  AND (st.per_unit = 'hour' OR st.per_unit IS NULL)
  AND st.item_type IS DISTINCT FROM 'product'
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid       -- exclude nycmaid
  AND (
    -- mapIndustry() ladder, lines 55-127 of industry-presets.ts, in order.
    -- Non-flat trades resolve to FALSE; the seven flat trades resolve to TRUE.
    -- First matching WHEN wins == first-match `return` in the JS function.
    -- JS \b word boundary is written as Postgres \y.
    CASE
      WHEN t.industry ~* 'water damage|fire damage|smoke|flood|mold|remediat|restoration|water extraction' THEN false  -- restoration
      WHEN t.industry ~* 'window clean' THEN false                                                                      -- window_cleaning
      WHEN t.industry ~* 'gutter' THEN false                                                                            -- gutter
      WHEN t.industry ~* 'carpet|upholstery' THEN false                                                                 -- carpet_cleaning
      WHEN t.industry ~* 'air ?duct|dryer vent' THEN false                                                              -- air_duct
      WHEN t.industry ~* 'pressure ?wash|power ?wash|soft ?wash' THEN false                                             -- pressure_washing
      WHEN t.industry ~* 'post.?construction' THEN false                                                                -- post_construction
      WHEN t.industry ~* 'trash ?bin|garbage ?can|bin clean' THEN true                                                  -- ★ bin_cleaning
      WHEN t.industry ~* 'pool' THEN false                                                                              -- pool
      WHEN t.industry ~* 'chimney' THEN false                                                                           -- chimney
      WHEN t.industry ~* 'house ?clean|maid|janitor|housekeep|\ycleaning\y' THEN false                                  -- cleaning
      WHEN t.industry ~* 'pet ?groom|dog ?groom|grooming' THEN false                                                    -- pet_grooming
      WHEN t.industry ~* 'pet ?waste|dog ?waste|poop|pooper' THEN true                                                  -- ★ pet_waste
      WHEN t.industry ~* 'dumpster|roll ?off|container rental' THEN true                                                -- ★ dumpster
      WHEN t.industry ~* 'junk|debris|\yhaul|cleanout' THEN true                                                        -- ★ junk_removal
      WHEN t.industry ~* 'tow|roadside|wrecker|recovery|jumpstart|lockout tow' THEN false                               -- towing
      WHEN t.industry ~* 'tree (service|trim|remov)|stump|arborist' THEN false                                          -- tree_service
      WHEN t.industry ~* 'snow|plow|de-?ice|ice removal' THEN true                                                      -- ★ snow_removal
      WHEN t.industry ~* 'irrigation|sprinkler' THEN false                                                              -- irrigation
      WHEN t.industry ~* 'lawn ?care|lawn ?mow|mowing' THEN false                                                       -- lawn_care
      WHEN t.industry ~* 'holiday|christmas light' THEN false                                                           -- holiday_lighting
      WHEN t.industry ~* 'landscap|hardscape|mulch|garden|sod\y' THEN false                                             -- landscaping
      WHEN t.industry ~* 'pest|extermin|termite|rodent|bed ?bug|mosquito|roach' THEN false                             -- pest
      WHEN t.industry ~* 'solar' THEN false                                                                             -- solar
      WHEN t.industry ~* 'smart ?home|security (install|system|camera)|home automation|surveillance' THEN false        -- smart_home
      WHEN t.industry ~* 'aging.?in.?place|accessibility|grab bar|wheelchair|\yada\y|mobility' THEN false               -- accessibility
      WHEN t.industry ~* 'appliance' THEN false                                                                         -- appliance_repair
      WHEN t.industry ~* 'garage ?door' THEN false                                                                      -- garage_door
      WHEN t.industry ~* 'locksmith|rekey|lock install' THEN false                                                      -- locksmith
      WHEN t.industry ~* 'home inspection|inspector|pre-?listing inspect' THEN false                                    -- home_inspection
      WHEN t.industry ~* 'septic' THEN false                                                                            -- septic
      WHEN t.industry ~* 'car detail|auto detail|mobile detail|detailing' THEN false                                    -- auto_detailing
      WHEN t.industry ~* 'roof' THEN false                                                                              -- roofing
      WHEN t.industry ~* 'siding|soffit|fascia' THEN false                                                              -- siding
      WHEN t.industry ~* 'epoxy|garage floor|floor coating' THEN false                                                  -- epoxy
      WHEN t.industry ~* 'floor(ing)?|hardwood|\ylvp\y|laminate|tile install' THEN false                                -- flooring
      WHEN t.industry ~* 'paint' THEN false                                                                             -- painting
      WHEN t.industry ~* 'concrete|masonry|paver|brick' THEN false                                                      -- concrete
      WHEN t.industry ~* 'paving|asphalt|sealcoat' THEN false                                                           -- paving
      WHEN t.industry ~* 'deck build|\ydeck\y|pergola' THEN false                                                       -- deck
      WHEN t.industry ~* 'fenc' THEN false                                                                              -- fencing
      WHEN t.industry ~* 'demolition|\ydemo\y|teardown' THEN false                                                      -- demolition
      WHEN t.industry ~* 'drywall|sheetrock|plaster' THEN false                                                         -- drywall
      WHEN t.industry ~* 'foundation|waterproof|basement seal|sump' THEN false                                          -- foundation
      WHEN t.industry ~* 'insulation|spray foam|air seal' THEN false                                                    -- insulation
      WHEN t.industry ~* 'moving|movers|relocation' THEN false                                                          -- moving
      WHEN t.industry ~* 'window.*door|replacement window|door install|entry door' THEN false                          -- windows_doors
      WHEN t.industry ~* 'stucco' THEN false                                                                            -- stucco
      WHEN t.industry ~* 'remodel|general contract|renovation|kitchen|bathroom remodel|addition' THEN false            -- remodeling
      WHEN t.industry ~* 'hvac|heating|cooling|air ?condition|furnace' THEN false                                       -- hvac
      WHEN t.industry ~* 'plumb|drain|sewer|water ?heater' THEN false                                                   -- plumbing
      WHEN t.industry ~* 'electric|\yev charger\y' THEN false                                                           -- electrical
      WHEN t.industry ~* 'salon|barber|\yhair\y|beauty|makeup|\ynail|blowout' THEN false                                -- mobile_salon
      WHEN t.industry ~* 'laundry|wash.*fold|dry ?clean|linen' THEN true                                                -- ★ laundry
      WHEN t.industry ~* 'interior ?design|decorat|home ?stag|\ystager\y|\ystaging\y' THEN false                        -- interior_design
      WHEN t.industry ~* 'fitness|trainer|\ygym\y|personal train|\yyoga\y|pilates' THEN true                            -- ★ fitness
      ELSE false                                                                                                        -- general / handyman / unmatched
    END
  );

-- PASS D — row-level safety net for flat-trade tenants whose industry carries NO
-- signal (stored literally as 'other' or blank), so PASS C cannot classify them.
-- Keys on the SERVICE ROW's own name/description, and ONLY on signatures that are
-- unambiguously flat for ANY tenant (a "10-Yard Dumpster" or "Wash & Fold" line is
-- flat no matter who sells it). Deliberately narrow to avoid clobbering a genuinely
-- hourly service. Same still-default guard, so idempotent.
UPDATE service_types st
SET per_unit = 'job',
    pricing_model = 'flat'
WHERE st.pricing_model = 'hourly'
  AND (st.per_unit = 'hour' OR st.per_unit IS NULL)
  AND st.item_type IS DISTINCT FROM 'product'
  AND st.tenant_id <> '00000000-0000-0000-0000-000000000001'::uuid   -- exclude nycmaid
  AND (
       st.name ~* 'dumpster|roll ?off'                               -- dumpster rental
    OR st.name ~* 'wash ?(&|and) ?fold|wash.?fold'                   -- laundry wash & fold
    OR st.name ~* 'bin cleaning|two-?bin|trash ?bin'                 -- bin_cleaning
    OR st.name ~* 'pet.?waste|dog.?waste|pooper'                     -- pet_waste
    OR st.description ~* 'pet.?waste|dog.?waste'                     -- pet_waste (desc)
  );

COMMIT;

-- DIAGNOSTIC 1 — remaining 'hourly' services grouped by tenant industry. Eyeball
-- for any flat-trade tenant still showing hourly rows.
SELECT t.industry,
       count(*) FILTER (WHERE st.pricing_model = 'hourly') AS still_hourly,
       count(*) FILTER (WHERE st.pricing_model = 'flat')   AS flat,
       count(*) FILTER (WHERE st.pricing_model = 'quote')  AS quote
FROM service_types st
JOIN tenants t ON t.id = st.tenant_id
WHERE t.id <> '00000000-0000-0000-0000-000000000001'::uuid
GROUP BY t.industry
ORDER BY still_hourly DESC, t.industry;

-- DIAGNOSTIC 2 — COVERAGE PROOF. Rows that STILL bill hourly but look like a flat
-- trade by either signal. This SHOULD return ZERO after the backfill. Any row here
-- is a flat service the passes above missed — investigate before trusting the fix.
-- (The industry test here is an APPROXIMATE OR of the seven target patterns — no
-- precedence — so it is intentionally over-inclusive for eyeballing; a match that
-- is actually a higher-precedence non-flat trade is a false positive to sanity-check,
-- not necessarily a miss.)
SELECT st.tenant_id, t.industry, st.name, st.per_unit, st.pricing_model
FROM service_types st
JOIN tenants t ON t.id = st.tenant_id
WHERE st.pricing_model = 'hourly'
  AND st.item_type IS DISTINCT FROM 'product'
  AND t.id <> '00000000-0000-0000-0000-000000000001'::uuid
  AND (
       t.industry ~* 'trash ?bin|garbage ?can|bin clean|pet ?waste|dog ?waste|poop|pooper|dumpster|roll ?off|container rental|junk|debris|\yhaul|cleanout|snow|plow|de-?ice|ice removal|laundry|wash.*fold|dry ?clean|linen|fitness|trainer|\ygym\y|personal train|\yyoga\y|pilates'
    OR st.name ~* 'dumpster|roll ?off|wash ?(&|and) ?fold|wash.?fold|bin cleaning|two-?bin|trash ?bin|pet.?waste|dog.?waste|pooper'
  )
ORDER BY t.industry, st.name;
