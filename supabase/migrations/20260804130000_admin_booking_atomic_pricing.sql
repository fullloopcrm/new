-- create_admin_booking_atomic never accepted price/hourly_rate/pay_rate/
-- discount_percent/one_time_credit_cents, so every booking created through
-- POST /api/bookings (admin dashboard's "emergency booking" path) silently
-- landed at price=0, hourly_rate=NULL regardless of what the client sent —
-- same bug class as cron/generate-recurring and /api/bookings/batch, found
-- and fixed the same day. No prod rows affected yet (zero existing bookings
-- match this path's signature), so no backfill needed — this closes the gap
-- before it's ever hit.
--
-- Adding trailing params to CREATE OR REPLACE creates a SECOND overload
-- instead of replacing the original (Postgres identifies functions by name +
-- full parameter list) — drop the old signature first so exactly one version
-- exists, or PostgREST RPC calls become ambiguous between the two.
DROP FUNCTION IF EXISTS public.create_admin_booking_atomic(
  uuid, uuid, uuid, uuid, uuid, text, timestamp with time zone, timestamp with time zone,
  text, text, text, timestamp with time zone, timestamp with time zone,
  timestamp with time zone, timestamp with time zone, integer, text
);

CREATE OR REPLACE FUNCTION public.create_admin_booking_atomic(
  p_tenant_id uuid,
  p_client_id uuid,
  p_property_id uuid,
  p_team_member_id uuid,
  p_service_type_id uuid,
  p_service_type text,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_notes text,
  p_special_instructions text,
  p_status text,
  p_conflict_start timestamp with time zone,
  p_conflict_end timestamp with time zone,
  p_day_start timestamp with time zone,
  p_day_end timestamp with time zone,
  p_max_jobs_per_day integer,
  p_source text DEFAULT 'admin'::text,
  p_price integer DEFAULT NULL,
  p_hourly_rate numeric DEFAULT NULL,
  p_pay_rate numeric DEFAULT NULL,
  p_discount_percent integer DEFAULT NULL,
  p_one_time_credit_cents integer DEFAULT NULL
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
    start_time, end_time, notes, special_instructions, status, source,
    price, hourly_rate, pay_rate, discount_percent, one_time_credit_cents
  ) VALUES (
    p_tenant_id, p_client_id, p_property_id, p_team_member_id, p_service_type_id, p_service_type,
    p_start_time, p_end_time, p_notes, p_special_instructions, p_status, p_source,
    p_price, p_hourly_rate, p_pay_rate, p_discount_percent, p_one_time_credit_cents
  )
  RETURNING to_jsonb(bookings.*) INTO v_booking;

  RETURN jsonb_build_object('created', true, 'booking', v_booking);
END;
$function$;
