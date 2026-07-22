-- 2026_07_21_equipment.sql
-- Equipment: a 4th catalog item_type for durable, depreciable assets that
-- get checked out and returned (dumpsters, generators, skid-steers) instead
-- of consumed like a product or performed like a service.
--
-- Two tables:
--   equipment          -- the physical asset: cost basis, depreciation
--                          schedule, status. Optionally tied to a
--                          service_types row (the sellable SKU multiple
--                          physical units can share, e.g. three "10-Yard
--                          Dumpster" units all pointing at one catalog row)
--                          -- nullable, since some equipment is internal-use
--                          only and never sold directly (a company mower).
--   equipment_bookings  -- the per-job rental record: which unit, which
--                          job/quote, what date range, what was charged.
--                          Drives both billing and availability.
--
-- Depreciation posts to Finance separately (1500 Equipment / 1510
-- Accumulated Depreciation / 5110 Depreciation Expense, see
-- 2026_07_21_chart_of_accounts_equipment_backfill.sql) on its own schedule,
-- independent of whether a given unit was booked out that week.

BEGIN;

ALTER TABLE service_types DROP CONSTRAINT IF EXISTS service_types_item_type_chk;
ALTER TABLE service_types ADD CONSTRAINT service_types_item_type_chk
  CHECK (item_type = ANY (ARRAY['service'::text, 'project'::text, 'product'::text, 'equipment'::text]));

CREATE TABLE IF NOT EXISTS equipment (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_type_id                 uuid REFERENCES service_types(id) ON DELETE SET NULL,
  category_id                     uuid REFERENCES categories(id) ON DELETE SET NULL,
  name                            text NOT NULL,
  asset_tag                       text,
  acquisition_cost_cents          integer NOT NULL DEFAULT 0,
  acquisition_date                date,
  useful_life_months              integer,
  salvage_value_cents             integer NOT NULL DEFAULT 0,
  depreciation_method             text NOT NULL DEFAULT 'straight_line' CHECK (depreciation_method IN ('straight_line')),
  accumulated_depreciation_cents  integer NOT NULL DEFAULT 0,
  status                          text NOT NULL DEFAULT 'available' CHECK (status IN ('available','out','maintenance','retired')),
  notes                           text,
  active                          boolean NOT NULL DEFAULT true,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_tenant_asset_tag ON equipment(tenant_id, asset_tag) WHERE asset_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_equipment_tenant_active ON equipment(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_equipment_service_type ON equipment(service_type_id) WHERE service_type_id IS NOT NULL;

CREATE OR REPLACE FUNCTION equipment_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_updated_at ON equipment;
CREATE TRIGGER trg_equipment_updated_at
  BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION equipment_set_updated_at();

CREATE TABLE IF NOT EXISTS equipment_bookings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  equipment_id  uuid NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  job_id        uuid REFERENCES jobs(id) ON DELETE SET NULL,
  quote_id      uuid REFERENCES quotes(id) ON DELETE SET NULL,
  start_date    date NOT NULL,
  end_date      date,
  status        text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','out','returned','cancelled')),
  rate_cents    integer NOT NULL DEFAULT 0,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_bookings_tenant ON equipment_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_equipment_bookings_equipment ON equipment_bookings(equipment_id, start_date);
CREATE INDEX IF NOT EXISTS idx_equipment_bookings_job ON equipment_bookings(job_id) WHERE job_id IS NOT NULL;

CREATE OR REPLACE FUNCTION equipment_bookings_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_equipment_bookings_updated_at ON equipment_bookings;
CREATE TRIGGER trg_equipment_bookings_updated_at
  BEFORE UPDATE ON equipment_bookings
  FOR EACH ROW EXECUTE FUNCTION equipment_bookings_set_updated_at();

COMMIT;
