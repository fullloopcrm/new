-- Migration 020: payment-processor parity with nycmaid
-- Adds columns that payment-processor.ts / confirm-match / webhook-stripe
-- expect but were missing from 011.

-- payments row needs reference_id (e.g. Venmo txn id) and a consistent
-- sender_name column name; confirm-match already uses payment_sender_name
-- so we add that as an alias column for writes and keep sender_name too.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_sender_name TEXT;

-- team_member_payouts — instant flag to distinguish Stripe instant vs standard
ALTER TABLE team_member_payouts ADD COLUMN IF NOT EXISTS instant BOOLEAN DEFAULT false;

-- bookings — support 15-min-alert timing + payment_sender_name on the
-- booking itself (already there from 011 but enforce here)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_sender_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tip_amount INTEGER DEFAULT 0;

-- domain_notes table for /api/domain-notes
CREATE TABLE IF NOT EXISTS domain_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  note TEXT NOT NULL,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_domain_notes_tenant_domain ON domain_notes(tenant_id, domain, created_at DESC);
ALTER TABLE domain_notes ENABLE ROW LEVEL SECURITY;

-- travel_time_cache — used by /api/admin/travel-times batch endpoint
CREATE TABLE IF NOT EXISTS travel_time_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  origin_lat NUMERIC NOT NULL,
  origin_lng NUMERIC NOT NULL,
  dest_lat NUMERIC NOT NULL,
  dest_lng NUMERIC NOT NULL,
  duration_seconds INTEGER,
  distance_meters INTEGER,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, origin_lat, origin_lng, dest_lat, dest_lng)
);
CREATE INDEX IF NOT EXISTS idx_travel_time_cache_tenant ON travel_time_cache(tenant_id);
ALTER TABLE travel_time_cache ENABLE ROW LEVEL SECURITY;

-- team_members needs lat/lng for geocode-backfill + availability scoring
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS has_car BOOLEAN DEFAULT false;

-- clients lat/lng too
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lng NUMERIC;
