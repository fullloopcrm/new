-- Smart scheduling: all new tables and columns for fullloopcrm

-- Booking notes
CREATE TABLE IF NOT EXISTS booking_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('admin', 'client', 'system')),
  author_name TEXT,
  content TEXT,
  images JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT content_or_images CHECK (content IS NOT NULL OR images != '[]'::jsonb)
);
CREATE INDEX IF NOT EXISTS idx_booking_notes_booking ON booking_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notes_tenant ON booking_notes(tenant_id);

-- Schedule issues
CREATE TABLE IF NOT EXISTS schedule_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  message TEXT NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booking_ids UUID[] DEFAULT '{}',
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schedule_issues_status ON schedule_issues(status);
CREATE INDEX IF NOT EXISTS idx_schedule_issues_tenant ON schedule_issues(tenant_id);

-- Team members: service zones + transportation
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS service_zones TEXT[] DEFAULT '{}';
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS has_car BOOLEAN DEFAULT false;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS max_travel_minutes INTEGER;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10,8);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11,8);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS home_by_time TEXT DEFAULT '18:00';

-- Clients: geocoded coordinates
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- Bookings: smart suggestion + running late
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS suggested_team_member_id UUID REFERENCES team_members(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS suggested_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS running_late_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS running_late_eta INTEGER;
