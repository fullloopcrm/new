-- Adopted from legacy hand-run migration: 009_closeout_fields.sql
-- Original commit date (git first-add): 2026-03-11T22:46:22-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
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
