-- Widen the "one payout per booking" guard to "one payout per (booking,
-- team member)" so a multi-cleaner job can pay every crew member, not just
-- whichever one claims the booking_id first.
--
-- Background: uq_payouts_tenant_booking (2026_07_11) was a correct backstop
-- when every booking had exactly one payee. Since then, multi-cleaner jobs
-- (booking_team_members: a lead + extras) were meant to each get their own
-- payout row (global-payouts-eligibility.ts, 2026-08-04, "each person gets
-- their own rate x hours") -- but the old index made a second insert for the
-- same booking_id (a different team_member_id) collide as "already paid",
-- so extras silently never got a payout row at all. Root-caused 2026-08-07
-- after a cleaner (Karina) worked a 2-person job and was never paid.
--
-- Same partial-index shape as the original (booking_id IS NOT NULL only --
-- some payouts aren't booking-linked), team_member_id added to the key.
--
-- Safe to run: DROP+CREATE of a UNIQUE INDEX, no data migration needed --
-- every existing row already satisfies the new, less restrictive constraint
-- (a superset of the old key can only ever have equal-or-fewer duplicates).

DROP INDEX IF EXISTS uq_payouts_tenant_booking;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payouts_tenant_booking_member
  ON team_member_payouts (tenant_id, booking_id, team_member_id)
  WHERE booking_id IS NOT NULL;
