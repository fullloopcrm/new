-- ============================================================
-- TERRITORIES — one trade per metro exclusivity
-- ============================================================
-- Each (industry_slug, metro_slug) pair represents a single sellable
-- license. Status drives the AVAILABLE / PENDING / CLAIMED widget on
-- every combo, industry, and metro page.

CREATE TABLE IF NOT EXISTS territories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_slug TEXT NOT NULL,
  metro_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  pending_since TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT territories_status_check CHECK (status IN ('available', 'pending', 'claimed')),
  CONSTRAINT territories_industry_metro_unique UNIQUE (industry_slug, metro_slug)
);

CREATE INDEX IF NOT EXISTS territories_status_idx ON territories (status);
CREATE INDEX IF NOT EXISTS territories_metro_idx ON territories (metro_slug);
CREATE INDEX IF NOT EXISTS territories_industry_idx ON territories (industry_slug);
CREATE INDEX IF NOT EXISTS territories_tenant_idx ON territories (tenant_id);

-- RLS: marketing pages read publicly; only service role writes.
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS territories_public_read ON territories;
CREATE POLICY territories_public_read ON territories
  FOR SELECT
  USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION territories_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS territories_updated_at_trigger ON territories;
CREATE TRIGGER territories_updated_at_trigger
  BEFORE UPDATE ON territories
  FOR EACH ROW
  EXECUTE FUNCTION territories_set_updated_at();
