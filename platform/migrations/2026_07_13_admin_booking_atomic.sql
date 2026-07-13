-- POST /api/bookings (admin/dashboard manual booking create): close two
-- TOCTOU races for team-member-assigned bookings.
--
-- The route ran two separate SELECTs — one to find overlapping bookings for
-- the assigned team member (scheduling conflict), one to count today's
-- bookings against max_jobs_per_day (daily cap) — each followed by a branch,
-- then a separate INSERT of the new booking. Two concurrent creates
-- assigning the SAME team_member_id to overlapping times (or to the same day
-- once at the cap) could both read a clean pre-insert state and both pass
-- both checks before either INSERT landed, double-booking the member's
-- calendar or oversubscribing their daily cap. Same TOCTOU shape as
-- migrations/2026_07_13_job_claim_atomic.sql and
-- migrations/2026_07_13_client_book_dedupe_atomic.sql — this route was
-- missed when those were fixed.
--
-- Fix: fold both checks and the INSERT into one plpgsql function that locks
-- the team_members row first (only when a team member is assigned), so a
-- concurrent call for the same member always recomputes both checks against
-- the first call's already-committed booking. Migration file only, not
-- applied to prod.
CREATE OR REPLACE FUNCTION public.create_admin_booking_atomic(
  p_tenant_id uuid,
  p_client_id uuid,
  p_property_id uuid,
  p_team_member_id uuid,
  p_service_type_id uuid,
  p_service_type text,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_notes text,
  p_special_instructions text,
  p_status text,
  p_conflict_start timestamptz,
  p_conflict_end timestamptz,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_max_jobs_per_day int
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_conflicts jsonb;
  v_cap_count int;
  v_booking jsonb;
BEGIN
  IF p_team_member_id IS NOT NULL THEN
    -- Lock the member row for the duration of this transaction: concurrent
    -- create_admin_booking_atomic calls for the same member serialize here.
    PERFORM 1 FROM public.team_members WHERE id = p_team_member_id AND tenant_id = p_tenant_id FOR UPDATE;

    -- Scheduling conflict (buffer-padded overlap window), same shape as the
    -- old inline check — always evaluated when a member + start_time are
    -- given, `force` does not bypass it.
    SELECT jsonb_agg(jsonb_build_object('id', b.id, 'start', b.start_time, 'end', b.end_time))
      INTO v_conflicts
    FROM public.bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.team_member_id = p_team_member_id
      AND b.status NOT IN ('cancelled', 'no_show')
      AND b.start_time < p_conflict_end
      AND b.end_time > p_conflict_start;

    IF v_conflicts IS NOT NULL THEN
      RETURN jsonb_build_object('created', false, 'reason', 'conflict', 'conflicts', v_conflicts);
    END IF;

    -- Daily job cap — caller passes NULL to skip (mirrors the old `!force`
    -- gate around this check).
    IF p_max_jobs_per_day IS NOT NULL AND p_max_jobs_per_day > 0 THEN
      SELECT count(*) INTO v_cap_count
      FROM public.bookings
      WHERE tenant_id = p_tenant_id
        AND team_member_id = p_team_member_id
        AND start_time >= p_day_start
        AND start_time <= p_day_end
        AND status NOT IN ('cancelled', 'no_show');

      IF v_cap_count >= p_max_jobs_per_day THEN
        RETURN jsonb_build_object('created', false, 'reason', 'max_jobs');
      END IF;
    END IF;
  END IF;

  INSERT INTO public.bookings (
    tenant_id, client_id, property_id, team_member_id, service_type_id, service_type,
    start_time, end_time, notes, special_instructions, status
  ) VALUES (
    p_tenant_id, p_client_id, p_property_id, p_team_member_id, p_service_type_id, p_service_type,
    p_start_time, p_end_time, p_notes, p_special_instructions, p_status
  )
  RETURNING to_jsonb(bookings.*) INTO v_booking;

  RETURN jsonb_build_object('created', true, 'booking', v_booking);
END;
$$;
