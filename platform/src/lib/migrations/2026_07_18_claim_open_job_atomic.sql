-- Atomic daily-cap-aware job claim for team-portal self-claim.
--
-- Flagged in deploy-prep/toctou-audit-p1-w3.md (2026-07-13) and left explicitly
-- unfixed: team-portal/jobs/claim's `max_jobs_per_day` cap was enforced via a
-- separate COUNT-then-decide read, followed by an unrelated atomic UPDATE for
-- the "job already taken" race. The job-taken race was already closed
-- (`WHERE team_member_id IS NULL`), but the cap check itself was not -- two
-- near-simultaneous claims for two DIFFERENT open bookings by the SAME member
-- could both read the same pre-claim count and both pass, landing the member
-- at cap+1 (or more, with more concurrency).
--
-- FILE ONLY -- not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it.

CREATE OR REPLACE FUNCTION claim_open_job(
  p_booking_id UUID,
  p_tenant_id UUID,
  p_member_id UUID,
  p_default_pay_rate NUMERIC,
  p_day_start TIMESTAMPTZ,
  p_day_end TIMESTAMPTZ
) RETURNS SETOF bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cap INTEGER;
  v_count INTEGER;
BEGIN
  -- FOR UPDATE locks this member's row for the rest of the transaction, so a
  -- second concurrent claim by the SAME member (any other booking_id) blocks
  -- here until the first call commits -- serializing the cap check instead of
  -- letting both read the same pre-claim count.
  SELECT max_jobs_per_day INTO v_cap
  FROM team_members
  WHERE id = p_member_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF v_cap IS NOT NULL AND v_cap > 0 THEN
    SELECT count(*) INTO v_count
    FROM bookings
    WHERE team_member_id = p_member_id
      AND tenant_id = p_tenant_id
      AND start_time >= p_day_start
      AND start_time < p_day_end
      AND status <> 'cancelled';

    IF v_count >= v_cap THEN
      RAISE EXCEPTION 'DAILY_CAP_REACHED: Daily job limit reached (%)', v_cap;
    END IF;
  END IF;

  RETURN QUERY
  UPDATE bookings
  SET team_member_id = p_member_id,
      status = 'confirmed',
      pay_rate = COALESCE(pay_rate, p_default_pay_rate)
  WHERE id = p_booking_id
    AND tenant_id = p_tenant_id
    AND team_member_id IS NULL
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_open_job(UUID, UUID, UUID, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
