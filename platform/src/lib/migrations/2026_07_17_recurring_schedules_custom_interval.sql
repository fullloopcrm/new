-- 2026_07_17_recurring_schedules_custom_interval.sql
-- recurring_schedules.recurring_type accepts 'custom' (BookingsAdmin.tsx's
-- "Custom..." repeat option, selectable today, POSTed to POST
-- /api/admin/recurring-schedules) but recurring_schedules has never had
-- anywhere to persist the chosen cadence. The initial batch of bookings
-- works fine (the client computes correctly-spaced dates itself and POSTs
-- them directly), but cron/generate-recurring's weekly refill has to invent
-- MORE dates itself with no client in the loop, and lib/recurring.ts's
-- generateRecurringDates 'custom' case has no interval to step by -- it can
-- only ever echo back its own anchor date. Net effect: every custom-interval
-- recurring series silently stops generating new bookings forever once its
-- initial ~42-day batch runs out, with no error and no admin-facing signal.
--
-- Additive, nullable, no default assumed. NULL means "no interval known" --
-- lib/recurring.ts treats that as "emit only the anchor" (today's exact
-- behavior), never as "guess a cadence". See the paired backfill file for
-- recovering this value from existing booking history where possible.

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS custom_interval_days INTEGER;

COMMENT ON COLUMN recurring_schedules.custom_interval_days IS
  'Only meaningful when recurring_type = ''custom''. Days between occurrences. NULL = never captured (pre-2026-07-17 custom schedule, or unrecoverable from booking history) -- cron/generate-recurring will not auto-refill until this is set; it will not guess a cadence.';
