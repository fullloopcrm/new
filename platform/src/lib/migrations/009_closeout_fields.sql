-- Migration 009: Add close-out workflow fields to bookings
-- Supports: actual labor tracking, team payment, discount, GPS location

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_pay NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_paid BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_paid_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_lat NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_out_lng NUMERIC;

-- Index for close-out queries (completed/in_progress jobs needing attention)
CREATE INDEX IF NOT EXISTS idx_bookings_closeout
  ON bookings(tenant_id, status, payment_status, team_paid)
  WHERE status IN ('completed', 'in_progress', 'paid');
