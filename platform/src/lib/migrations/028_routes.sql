-- Migration 028: Route optimization
-- One route per team_member per day. Stops are a denormalized JSONB array
-- for read performance — authoritative source is bookings.id refs.

-- Add HQ coordinates to tenants (starting point when team member has no home address)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS hq_latitude NUMERIC(10, 8),
  ADD COLUMN IF NOT EXISTS hq_longitude NUMERIC(11, 8);

-- ─── routes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  route_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'optimized', 'published', 'started', 'completed', 'cancelled')),

  -- Starting point (team member home or tenant HQ)
  start_address TEXT,
  start_latitude NUMERIC(10, 8),
  start_longitude NUMERIC(11, 8),
  end_address TEXT,        -- optional end destination; defaults to start
  end_latitude NUMERIC(10, 8),
  end_longitude NUMERIC(11, 8),

  -- Stops: [{ booking_id, client_id, order, address, lat, lng, arrival_window_start,
  --          arrival_window_end, duration_minutes, notes, client_name }]
  stops JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Totals (recomputed by optimizer)
  total_distance_meters INTEGER,
  total_duration_seconds INTEGER,
  total_stops INTEGER NOT NULL DEFAULT 0,

  -- Timing
  scheduled_start_time TIME,

  -- Lifecycle timestamps
  optimized_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_tenant_date ON routes(tenant_id, route_date);
CREATE INDEX IF NOT EXISTS idx_routes_tenant_tm_date ON routes(tenant_id, team_member_id, route_date);
CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(tenant_id, status) WHERE status IN ('draft','optimized','published','started');

CREATE OR REPLACE FUNCTION routes_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_routes_updated_at ON routes;
CREATE TRIGGER trg_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION routes_set_updated_at();

-- Back-link on bookings so a booking can report which route it's on
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_route ON bookings(route_id) WHERE route_id IS NOT NULL;
