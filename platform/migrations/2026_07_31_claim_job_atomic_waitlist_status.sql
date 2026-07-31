-- claim_job_atomic previously set every claimed booking to status='confirmed',
-- regardless of what it was before. Waitlist-origin bookings start life at
-- status='pending' (auto-created the moment a client waitlists, not yet
-- admin-approved like other pending bookings) — Jeff wants those to land on
-- 'scheduled' specifically when a cleaner claims them, while every other
-- claim (an already scheduled/confirmed open job being picked up) keeps the
-- existing 'confirmed' behavior unchanged. `b.status` on the right of SET
-- refers to the row's value BEFORE this UPDATE, so this is safe to key off.
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
      status = CASE WHEN b.status = 'pending' THEN 'scheduled' ELSE 'confirmed' END
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
