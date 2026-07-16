-- 2026_07_16_booking_overlap_trigger_advisory_lock_PROPOSED.sql
--
-- Closes a race condition in trg_block_booking_overlap (015_booking_overlap_trigger.sql).
--
-- THE RACE: that trigger prevents overlap by SELECTing existing bookings for
-- the same team_member and RAISEing if one overlaps NEW's time range. Under
-- READ COMMITTED (Postgres default), each concurrent INSERT statement gets
-- its own snapshot. Two simultaneous booking-create requests for the SAME
-- team_member into the SAME (or overlapping) slot — e.g. two staff members
-- both clicking "assign" on a smart-schedule suggestion, or a client
-- double-tapping submit while a retry is in flight — can each run the
-- trigger's SELECT before the OTHER's INSERT has committed. Neither sees the
-- other's (still-uncommitted) row, both checks pass, both INSERTs succeed:
-- the team_member ends up double-booked into overlapping jobs despite the
-- trigger existing. This is exactly the class of bug a real EXCLUDE
-- constraint prevents atomically (the original 015 comment notes EXCLUDE was
-- rejected because tstzrange is STABLE not IMMUTABLE) — the BEFORE-trigger
-- substitute reintroduced the TOCTOU window EXCLUDE was meant to close.
--
-- THE FIX: take a transaction-scoped advisory lock keyed on (tenant_id,
-- team_member_id) at the top of the trigger, before the conflict SELECT.
-- pg_advisory_xact_lock blocks a second concurrent transaction touching the
-- same team_member until the first COMMITs or ROLLBACKs — so the second
-- transaction's conflict SELECT is guaranteed to see the first transaction's
-- row (if committed) or find it already gone (if rolled back). This makes
-- the overlap check atomic per team_member without requiring a GiST/EXCLUDE
-- constraint. Held for the transaction only (auto-released at COMMIT/ROLLBACK,
-- not requiring an explicit unlock) — matches booking creation always
-- running as a single-statement transaction.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_16_booking_overlap_trigger_advisory_lock_PROPOSED.sql

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

  -- Serialize concurrent overlap checks for this team_member within this
  -- tenant. hashtextextended folds both ids into one bigint lock key so two
  -- different tenants' identically-scheduled team members never contend on
  -- the same lock. Waits (does not fail) if another transaction holds it —
  -- the loser then re-checks against the winner's now-committed row.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(NEW.tenant_id::text || ':' || NEW.team_member_id::text, 0)
  );

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

-- Trigger definition itself is unchanged (same name/timing/columns) — only
-- the function body changed, so no DROP/CREATE TRIGGER needed.

COMMIT;

-- Verify:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trg_block_booking_overlap';
-- SELECT prosrc FROM pg_proc WHERE proname = 'fn_block_booking_overlap';
--   (confirm pg_advisory_xact_lock appears in the function body)
--
-- Manual race repro (run concurrently in two psql sessions against a test
-- team_member with no existing bookings, same tenant_id):
--   Session A: BEGIN; INSERT INTO bookings (...) VALUES (... team_member_id=X, 10:00-11:00 ...); -- hold, don't commit
--   Session B: INSERT INTO bookings (...) VALUES (... same team_member_id=X, 10:30-11:30 ...);
--   Before this fix: B's INSERT would block only if A already committed; if A
--   is mid-transaction, B's trigger SELECT misses A's uncommitted row and B
--   succeeds — then A commits too, leaving two overlapping bookings.
--   After this fix: B blocks on the advisory lock until A commits/rolls back,
--   then B's SELECT correctly sees A's row (if committed) and raises.
