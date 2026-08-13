-- "Referred by" (referrer / sales partner) attribution was only ever wired
-- into the public referral-link booking flow (POST /api/client/book sets
-- bookings.referrer_id from the ?ref= code) and the referrer analytics/
-- commissions routes that read it back. Every admin-facing surface --
-- CreateBookingForm, EditBookingForm, BookingsAdmin's inline forms, and the
-- whole recurring-schedule pipeline -- had no field for it at all, so a
-- staff-created or staff-edited booking (one-time or recurring) never
-- carried attribution, and referrer/sales-partner commission tracking
-- silently missed every booking that didn't come through a referral link.
--
-- Part 1: recurring_schedules never had these columns, so generated
-- occurrences (cron backfill + manual regenerate) had nothing to copy
-- attribution from even once the admin UI is wired up.
ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES referrers(id) ON DELETE SET NULL;
ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS sales_partner_id uuid REFERENCES sales_partners(id) ON DELETE SET NULL;

-- Part 2: create_admin_booking_atomic (the RPC every admin/dashboard manual
-- booking create goes through, migrations/2026_07_13_admin_booking_atomic.sql
-- + src/lib/migrations/2026_07_25_booking_atomic_source_param.sql) never
-- took referrer_id/sales_partner_id params, so a staff-picked referrer had
-- nowhere to land even with a form field. New trailing optional params,
-- same backward-compatible append pattern as the source_param migration --
-- restated in full from the LIVE deployed definition (pulled via the
-- Supabase Management API 2026-08-13), which already carries p_price/
-- p_hourly_rate/p_pay_rate/p_discount_percent/p_one_time_credit_cents that
-- no migration file in this repo documents -- those were added directly
-- against prod at some point without a committed migration. Omitting them
-- here would silently drop price/pay-rate/discount support from every new
-- admin booking platform-wide.
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
  p_price integer DEFAULT NULL::integer,
  p_hourly_rate numeric DEFAULT NULL::numeric,
  p_pay_rate numeric DEFAULT NULL::numeric,
  p_discount_percent integer DEFAULT NULL::integer,
  p_one_time_credit_cents integer DEFAULT NULL::integer,
  p_referrer_id uuid DEFAULT NULL::uuid,
  p_sales_partner_id uuid DEFAULT NULL::uuid
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
    price, hourly_rate, pay_rate, discount_percent, one_time_credit_cents,
    referrer_id, sales_partner_id
  ) VALUES (
    p_tenant_id, p_client_id, p_property_id, p_team_member_id, p_service_type_id, p_service_type,
    p_start_time, p_end_time, p_notes, p_special_instructions, p_status, p_source,
    p_price, p_hourly_rate, p_pay_rate, p_discount_percent, p_one_time_credit_cents,
    p_referrer_id, p_sales_partner_id
  )
  RETURNING to_jsonb(bookings.*) INTO v_booking;

  RETURN jsonb_build_object('created', true, 'booking', v_booking);
END;
$function$;
