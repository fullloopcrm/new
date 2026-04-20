-- 015_booking_overlap_trigger.sql
-- Replaces the EXCLUDE constraint approach (which Postgres rejected because
-- tstzrange is STABLE not IMMUTABLE) with a BEFORE INSERT/UPDATE trigger that
-- raises on overlap. Same goal: prevent two active bookings on the same
-- team_member from overlapping in time.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/015_booking_overlap_trigger.sql

BEGIN;

CREATE OR REPLACE FUNCTION fn_block_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_id uuid;
BEGIN
  -- Skip when there's no team member assigned, no time, or the row is being cancelled.
  IF NEW.team_member_id IS NULL
     OR NEW.start_time IS NULL
     OR NEW.end_time IS NULL
     OR NEW.status IN ('cancelled', 'no_show') THEN
    RETURN NEW;
  END IF;

  SELECT id INTO conflict_id
  FROM bookings
  WHERE tenant_id = NEW.tenant_id
    AND team_member_id = NEW.team_member_id
    AND id <> NEW.id
    AND status NOT IN ('cancelled', 'no_show')
    AND start_time < NEW.end_time
    AND end_time   > NEW.start_time
  LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Booking overlap: team_member % already has booking % during %–%',
      NEW.team_member_id, conflict_id, NEW.start_time, NEW.end_time
      USING ERRCODE = 'exclusion_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_booking_overlap ON bookings;
CREATE TRIGGER trg_block_booking_overlap
  BEFORE INSERT OR UPDATE OF team_member_id, start_time, end_time, status
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION fn_block_booking_overlap();

COMMIT;

-- Verify:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_block_booking_overlap';
