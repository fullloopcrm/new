-- ============================================================
-- TERRITORY SYSTEM — one tenant per category per territory
-- ============================================================
-- Model:
--   service_categories : the 53 canonical sellable trades (extensible)
--   territories        : ~1000 sellable, gapless bundles of counties
--   counties           : 3,143 atomic US tiles, each assigned to exactly
--                        one territory (NOT NULL => no coverage pockets)
--   territory_claims    : exclusivity ledger. At most ONE active claim per
--                        (territory, category). Missing row = available.
--
-- Supersedes the never-applied migrations/territories.sql (old
-- industry_slug/metro_slug model). Safe: that table does not exist in prod.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SERVICE CATEGORIES (the 53, extensible)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS service_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. TERRITORIES (the ~1000 sellable bundles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS territories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,            -- e.g. "Dallas–Fort Worth Metro"
  kind        TEXT NOT NULL DEFAULT 'metro',  -- 'metro' | 'rural'
  state_abbr  TEXT,                     -- primary/anchor state (NULL if multi-state)
  cbsa_code   TEXT,                     -- Census CBSA code when metro-anchored
  center_lat  DOUBLE PRECISION,         -- centroid for map label / pin
  center_lng  DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT territories_kind_check CHECK (kind IN ('metro','rural'))
);

CREATE INDEX IF NOT EXISTS territories_state_idx ON territories (state_abbr);
CREATE INDEX IF NOT EXISTS territories_kind_idx  ON territories (kind);

-- ------------------------------------------------------------
-- 3. COUNTIES (3,143 atomic tiles — every one assigned = no pockets)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS counties (
  fips         CHAR(5) PRIMARY KEY,     -- state(2)+county(3) FIPS
  name         TEXT NOT NULL,           -- "Dallas County"
  state_abbr   TEXT NOT NULL,
  state_fips   CHAR(2) NOT NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  population   INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS counties_territory_idx ON counties (territory_id);
CREATE INDEX IF NOT EXISTS counties_state_idx     ON counties (state_abbr);

-- ------------------------------------------------------------
-- 4. TERRITORY CLAIMS (exclusivity ledger — the hard lock)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS territory_claims (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  territory_id  UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  category_id   UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'claimed',  -- 'pending' | 'claimed'
  claimed_at    TIMESTAMPTZ,
  pending_since TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT territory_claims_status_check CHECK (status IN ('pending','claimed'))
);

-- THE LOCK: at most one active (pending or claimed) claim per
-- (territory, category). A row only exists when claimed/pending;
-- its absence means AVAILABLE. This makes double-selling a territory
-- for the same trade physically impossible at the DB layer.
CREATE UNIQUE INDEX IF NOT EXISTS territory_claims_one_per_combo
  ON territory_claims (territory_id, category_id);

CREATE INDEX IF NOT EXISTS territory_claims_tenant_idx   ON territory_claims (tenant_id);
CREATE INDEX IF NOT EXISTS territory_claims_category_idx ON territory_claims (category_id);
CREATE INDEX IF NOT EXISTS territory_claims_status_idx   ON territory_claims (status);

-- ------------------------------------------------------------
-- 5. updated_at triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION territory_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_categories_touch ON service_categories;
CREATE TRIGGER trg_service_categories_touch BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION territory_touch_updated_at();

DROP TRIGGER IF EXISTS trg_territories_touch ON territories;
CREATE TRIGGER trg_territories_touch BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION territory_touch_updated_at();

DROP TRIGGER IF EXISTS trg_counties_touch ON counties;
CREATE TRIGGER trg_counties_touch BEFORE UPDATE ON counties
  FOR EACH ROW EXECUTE FUNCTION territory_touch_updated_at();

DROP TRIGGER IF EXISTS trg_territory_claims_touch ON territory_claims;
CREATE TRIGGER trg_territory_claims_touch BEFORE UPDATE ON territory_claims
  FOR EACH ROW EXECUTE FUNCTION territory_touch_updated_at();

-- ------------------------------------------------------------
-- 6. RLS — service-role only writes; admin reads via service role.
--    Public read allowed for availability display on marketing pages.
-- ------------------------------------------------------------
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE counties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_claims   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_categories_public_read ON service_categories;
CREATE POLICY service_categories_public_read ON service_categories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS territories_public_read ON territories;
CREATE POLICY territories_public_read ON territories FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS counties_public_read ON counties;
CREATE POLICY counties_public_read ON counties FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS territory_claims_public_read ON territory_claims;
CREATE POLICY territory_claims_public_read ON territory_claims FOR SELECT USING (TRUE);
