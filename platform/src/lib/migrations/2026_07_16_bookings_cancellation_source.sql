-- 2026_07_16_bookings_cancellation_source.sql
-- W1 fix for a real service gap (P1 refill queue): resuming a paused
-- recurring_schedule early only flips the schedule back to status='active'
-- (src/app/api/schedules/[id]/pause/route.ts DELETE and
-- src/app/api/admin/recurring-schedules/[id]/pause/route.ts DELETE) — it
-- never looks at the bookings the matching POST handler cancelled when the
-- pause started. Those visits stay status='cancelled' forever; the client
-- paid for/expects a standing schedule but silently loses every visit that
-- fell inside the (now-shortened) pause window.
--
-- To restore them safely on early resume we need to tell "cancelled because
-- this schedule was paused" apart from any other cancellation reason (client
-- cancelled one visit, no-show, etc.) — nothing on `bookings` currently does
-- that. Additive, nullable, no backfill needed (existing cancelled rows have
-- no recorded reason and should stay untouched/unrestored).

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_schedule_cancelled_reason
  ON bookings (schedule_id, cancelled_reason)
  WHERE cancelled_reason IS NOT NULL;
