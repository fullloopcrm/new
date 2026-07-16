-- 2026_07_16_pest_treatment_logs.sql
-- W1 (P1 schema lane) — pest-control chemical/treatment application log.
--
-- WHY: pesticide applicators are required (EPA + most state DEC/DEP rules,
-- e.g. NY 6VAC5) to keep a per-application record of what product was used,
-- on what pest, where, how, at what rate, and by which licensed applicator —
-- kept for a period of years and producible on inspection. This repo has a
-- live pest-control tenant (site/the-nyc-exterminator) and an industry preset
-- ('pest' in industry-presets.ts) but no record of a treatment ever performed
-- exists anywhere in the schema. Global feature per platform/CLAUDE.md: one
-- table, one API, one dashboard page — tenant differences are just whether a
-- given tenant's crews use it, not forked code.
--
-- Additive-only, new table, nothing else touched. tenant_id scoped like every
-- other tenant-owned table; RLS enabled to match 046_rls_deny_on_new_tables's
-- deny-by-default posture for new tables.
--
-- booking_id/client_id/team_member_id are nullable + ON DELETE SET NULL: the
-- compliance record must survive the booking/client/employee row being
-- deleted later (regulators care about the historical record existing, not
-- about it cascading away with an unrelated delete).
CREATE TABLE IF NOT EXISTS pest_treatment_logs (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id               UUID REFERENCES bookings(id) ON DELETE SET NULL,
  client_id                UUID REFERENCES clients(id) ON DELETE SET NULL,
  team_member_id           UUID REFERENCES team_members(id) ON DELETE SET NULL, -- applicator who performed the work

  application_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  service_address          TEXT,

  target_pest              TEXT NOT NULL,
  product_name              TEXT NOT NULL,
  epa_reg_number            TEXT,   -- EPA registration number printed on the product label
  active_ingredient         TEXT,

  application_method        TEXT NOT NULL DEFAULT 'spray'
                              CHECK (application_method IN ('spray', 'bait', 'dust', 'granular', 'fog', 'injection', 'other')),
  -- Free-text, not numeric+unit columns: labels/state forms mix units
  -- (fl oz, oz, gal, lbs, %) and there is no single canonical unit to force.
  quantity_used             TEXT,
  dilution_rate             TEXT,
  area_treated              TEXT,   -- rooms/areas or sq ft treated, as recorded by the applicator
  weather_conditions        TEXT,   -- temp/wind/precip — required on the label for many outdoor products

  -- Point-in-time copy of the applicator's license number at the moment of
  -- this application (not a join to hr_documents — a license can be
  -- renewed/changed later; the record must reflect what was true then).
  applicator_license_number TEXT,

  notes                     TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pest_treatment_logs_tenant_date
  ON pest_treatment_logs (tenant_id, application_date DESC);
CREATE INDEX IF NOT EXISTS idx_pest_treatment_logs_booking
  ON pest_treatment_logs (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pest_treatment_logs_member
  ON pest_treatment_logs (team_member_id) WHERE team_member_id IS NOT NULL;

ALTER TABLE pest_treatment_logs ENABLE ROW LEVEL SECURITY;
