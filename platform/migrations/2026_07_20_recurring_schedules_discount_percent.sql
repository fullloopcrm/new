-- Found via a live stress test of the booking-smart-scheduling-port branch:
-- admin/recurring-schedules/route.ts already wrote to recurring_schedules.
-- discount_percent and .invoice_consolidation, and team-portal/checkout/
-- route.ts already read bookings.discount_percent — none of the three
-- columns actually existed. Every one of these code paths would 500 the
-- first time it was really exercised. Adding the columns the code already
-- assumes are there (not renaming/removing anything).
--
-- NOTE: team-portal/checkout/route.ts also selects bookings.
-- one_time_credit_cents, which is ALSO missing — NOT added here, that's a
-- separate pre-existing bug outside the scope of this branch. Flagged
-- separately, not fixed in this migration.
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS discount_percent integer;
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS invoice_consolidation text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_percent integer;
