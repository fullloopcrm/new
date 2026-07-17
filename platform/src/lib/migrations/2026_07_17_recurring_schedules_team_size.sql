-- 2026_07_17_recurring_schedules_team_size.sql
-- bookings.team_size is a real billing multiplier -- closeout-summary
-- (grossCents = billedHours * hourlyRate * teamSize) and team-portal/checkout
-- (updatedPriceCents = billableClient * clientRate * teamSize, the actual
-- charge recorded at checkout) both read it directly. POST /api/client/recurring
-- lets a client pick a lead + extra_cleaner_ids and computes finalTeamSize,
-- but recurring_schedules has never had anywhere to persist it -- only the
-- INITIAL batch of bookings (rows.map in that route) ever carried team_size.
-- cron/generate-recurring's weekly refill (the bulk of a series' lifetime,
-- everything past the first ~6 weeks) has no client in the loop and builds
-- its insert from `schedule` alone, which has no team_size to read -- every
-- refilled occurrence silently reverted to team_size default (1), so a
-- multi-person recurring cleaning billed correctly for its first ~6 weeks
-- then permanently under-billed (and under-reported for revenue purposes)
-- as a solo job for the rest of the series, no error, no signal.
--
-- Additive, nullable, no default assumed. NULL means "no crew size known" --
-- every read site already does `Math.max(1, team_size || 1)`, so NULL and 1
-- behave identically (solo job, today's exact behavior). See the paired
-- backfill file for recovering this from existing booking history where
-- the initial batch actually used a crew > 1.

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS team_size INTEGER;

COMMENT ON COLUMN recurring_schedules.team_size IS
  'Crew size (lead + extras) to stamp onto every generated booking, including cron/generate-recurring refills. NULL = solo (1), same as every read site''s Math.max(1, team_size || 1) fallback.';
