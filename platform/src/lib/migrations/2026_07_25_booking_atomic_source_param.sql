-- Both atomic booking-creation RPCs need to tag bookings.source at insert
-- time. Adding p_source as a new trailing param with a DEFAULT keeps this
-- backward compatible -- Postgres allows appending optional params to an
-- existing function via CREATE OR REPLACE without touching the rest of the
-- signature. Threading it through the RPC (rather than a follow-up UPDATE
-- from the route) avoids both an extra round-trip and the race between the
-- INSERT and a second write.

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_tenant_id uuid, p_client_id uuid, p_property_id uuid, p_start_time timestamp with time zone,
  p_end_time timestamp with time zone, p_service_type text, p_price numeric, p_hourly_rate numeric,
  p_team_size integer, p_is_emergency boolean, p_max_hours numeric, p_notes text, p_recurring_type text,
  p_team_member_token text, p_token_expires_at timestamp with time zone, p_referrer_id uuid, p_ref_code text,
  p_day_start timestamp with time zone, p_day_end timestamp with time zone, p_active_statuses text[],
  p_source text DEFAULT 'other'
)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_existing int;
  v_booking jsonb;
BEGIN
  PERFORM 1 FROM public.clients WHERE id = p_client_id AND tenant_id = p_tenant_id FOR UPDATE;

  SELECT count(*) INTO v_existing
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND client_id = p_client_id
    AND start_time >= p_day_start
    AND start_time < p_day_end
    AND status = ANY(p_active_statuses);

  IF v_existing > 0 THEN
    RETURN jsonb_build_object('created', false, 'reason', 'duplicate_date');
  END IF;

  INSERT INTO public.bookings (
    tenant_id, client_id, property_id, team_member_id, start_time, end_time,
    service_type, status, price, hourly_rate, team_size, is_emergency,
    max_hours, notes, recurring_type, team_member_token, token_expires_at,
    referrer_id, ref_code, source
  ) VALUES (
    p_tenant_id, p_client_id, p_property_id, NULL, p_start_time, p_end_time,
    p_service_type, 'pending', p_price, p_hourly_rate, p_team_size, p_is_emergency,
    p_max_hours, p_notes, p_recurring_type, p_team_member_token, p_token_expires_at,
    p_referrer_id, p_ref_code, p_source
  )
  RETURNING to_jsonb(bookings.*) INTO v_booking;

  RETURN jsonb_build_object('created', true, 'booking', v_booking);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_booking_atomic(
  p_tenant_id uuid, p_client_id uuid, p_property_id uuid, p_team_member_id uuid, p_service_type_id uuid,
  p_service_type text, p_start_time timestamp with time zone, p_end_time timestamp with time zone,
  p_notes text, p_special_instructions text, p_status text, p_conflict_start timestamp with time zone,
  p_conflict_end timestamp with time zone, p_day_start timestamp with time zone, p_day_end timestamp with time zone,
  p_max_jobs_per_day integer, p_source text DEFAULT 'admin'
)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_conflicts jsonb;
  v_cap_count int;
  v_booking jsonb;
BEGIN
  IF p_team_member_id IS NOT NULL THEN
    PERFORM 1 FROM public.team_members WHERE id = p_team_member_id AND tenant_id = p_tenant_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'team_member % not found for tenant %', p_team_member_id, p_tenant_id;
    END IF;

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
    start_time, end_time, notes, special_instructions, status, source
  ) VALUES (
    p_tenant_id, p_client_id, p_property_id, p_team_member_id, p_service_type_id, p_service_type,
    p_start_time, p_end_time, p_notes, p_special_instructions, p_status, p_source
  )
  RETURNING to_jsonb(bookings.*) INTO v_booking;

  RETURN jsonb_build_object('created', true, 'booking', v_booking);
END;
$function$;
