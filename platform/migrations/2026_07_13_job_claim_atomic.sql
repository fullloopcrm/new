-- team-portal/jobs/claim: close the daily-cap TOCTOU race.
--
-- The route used to run two separate statements: SELECT count(*) of the
-- member's bookings today, branch on count >= cap, then UPDATE the target
-- booking. Two concurrent claims (different booking_ids, same member) could
-- both read the same pre-update count and both pass the cap check before
-- either UPDATE commits, letting the member exceed max_jobs_per_day by one
-- per overlapping request (narrow window, non-monetary — flagged by W3).
--
-- Fix: fold the count check and the claiming UPDATE into one plpgsql
-- function, with `SELECT ... FOR UPDATE` locking the member's team_members
-- row first. A concurrent call for the same member blocks on that lock until
-- the first call's transaction commits, so the second call's count recompute
-- always sees the first call's claim — the cap can no longer be
-- oversubscribed by racing requests. The booking's own `team_member_id IS
-- NULL` guard on the UPDATE still makes claiming a single booking
-- first-writer-wins, unchanged from before.
CREATE OR REPLACE FUNCTION public.claim_job_atomic(
  p_tenant_id uuid,
  p_member_id uuid,
  p_booking_id uuid,
  p_day_start timestamptz,
  p_day_end timestamptz
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_cap int;
  v_pay_rate numeric;
  v_count int;
  v_booking jsonb;
BEGIN
  -- Lock the member row for the duration of this transaction: concurrent
  -- claim_job_atomic calls for the same member serialize here.
  SELECT max_jobs_per_day, pay_rate INTO v_cap, v_pay_rate
  FROM public.team_members
  WHERE id = p_member_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_cap IS NOT NULL AND v_cap > 0 THEN
    SELECT count(*) INTO v_count
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND team_member_id = p_member_id
      AND start_time >= p_day_start
      AND start_time < p_day_end
      AND status <> 'cancelled';

    IF v_count >= v_cap THEN
      RETURN jsonb_build_object('claimed', false, 'reason', 'cap_reached', 'cap', v_cap);
    END IF;
  END IF;

  UPDATE public.bookings b
  SET team_member_id = p_member_id,
      pay_rate = v_pay_rate,
      status = 'confirmed'
  WHERE b.id = p_booking_id
    AND b.tenant_id = p_tenant_id
    AND b.team_member_id IS NULL
  RETURNING to_jsonb(b.*) INTO v_booking;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_taken');
  END IF;

  RETURN jsonb_build_object('claimed', true, 'reason', 'ok', 'booking', v_booking);
END;
$$;
