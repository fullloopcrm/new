-- 2026_07_23_cleaner_broadcasts_booking_link.sql
-- Find-a-Team-Member was standalone (manual job_date/address entry, no link
-- back to the booking or client it's actually for). Adds the FK columns so a
-- broadcast can be launched from a real booking, and so an admin can assign
-- whoever responds straight back onto that booking.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_23_cleaner_broadcasts_booking_link.sql
-- NOT YET APPLIED TO PROD. Depends on 008_cleaner_broadcasts.sql (also not yet applied) -- apply in order.

BEGIN;

ALTER TABLE cleaner_broadcasts
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cleaner_broadcasts_booking ON cleaner_broadcasts(booking_id) WHERE booking_id IS NOT NULL;

-- 008 left cleaner_broadcast_recipients.cleaner_id as a bare uuid (comment-only
-- reference to team_members.id, no real constraint) -- add the actual FK so
-- PostgREST can resolve a `team_members(name)` embed from the recent-broadcasts
-- API without an ambiguous-relationship error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cleaner_broadcast_recipients_cleaner_id_fkey'
  ) THEN
    ALTER TABLE cleaner_broadcast_recipients
      ADD CONSTRAINT cleaner_broadcast_recipients_cleaner_id_fkey
      FOREIGN KEY (cleaner_id) REFERENCES team_members(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
