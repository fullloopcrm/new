-- Found via a live stress test of the booking-smart-scheduling-port branch:
-- admin/recurring-schedules/route.ts already wrote to recurring_schedules.
-- discount_percent and .invoice_consolidation, and team-portal/checkout/
-- route.ts already read bookings.discount_percent — none of the three
-- columns actually existed. Every one of these code paths would 500 the
-- first time it was really exercised. Adding the columns the code already
-- assumes are there (not renaming/removing anything).
--
-- team-portal/checkout/route.ts's select also referenced bookings.
-- one_time_credit_cents and bookings/clients.sales_partner_id, neither of
-- which existed either. one_time_credit_cents added below. sales_partner_id
-- turned out to belong to a whole separate, already-written feature (the
-- Commission Sales Partner program, src/lib/migrations/2026_07_18_sales_
-- partners.sql + 2026_07_19_sales_partner_agreement.sql) that was merged to
-- main but never actually applied to the database — applied directly, not
-- part of this file (those migrations already existed correctly, they just
-- needed to be run).
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS discount_percent integer;
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS invoice_consolidation text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_percent integer;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS one_time_credit_cents integer;
