-- 2026_07_17_recurring_schedules_extra_team_member_ids.sql
-- recurring_schedules.team_size (2026_07_17_recurring_schedules_team_size.sql)
-- fixed the BILLING multiplier for cron/generate-recurring's refill, but left
-- a second, deeper gap: the schedule has nowhere to persist WHICH team
-- members the extra crew slots actually are, only the headcount.
--
-- POST /api/client/recurring creates booking_team_members rows (lead +
-- named extras) for the INITIAL batch of bookings only. cron/generate-
-- recurring's refill -- again the bulk of any series' lifetime -- has no
-- client in the loop and, until now, had no column to read the extras'
-- identities from even if it wanted to: every refilled occurrence correctly
-- billed for team_size people (after the prior fix) but created ZERO
-- booking_team_members rows, so:
--   - the admin booking-edit "Team" panel (GET /api/bookings/:id/team, wired
--     into BookingsAdmin.tsx's edit-modal extras loader) shows the crew slot
--     blank for every refilled occurrence -- no record of who was actually
--     dispatched as the second/third cleaner.
--   - closeout-summary's teamMembers list falls back to its `else if
--     (booking.team_member_id)` branch (lead only, no hourly_rate), so a
--     2-person refilled job's closeout view can't show or attribute payout
--     to the extra crew member at all, even though the client was correctly
--     billed for both.
--
-- Additive, nullable, no default -- NULL/empty means "no named extras known",
-- identical in effect to team_size<=1 (solo). Paired backfill file recovers
-- this from ground truth for existing schedules.

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS extra_team_member_ids UUID[];

COMMENT ON COLUMN recurring_schedules.extra_team_member_ids IS
  'Non-lead crew member ids to stamp onto booking_team_members for every generated booking, including cron/generate-recurring refills and the admin regenerate route. NULL/empty = no named extras (solo or lead-only), same effective behavior as team_size<=1.';
