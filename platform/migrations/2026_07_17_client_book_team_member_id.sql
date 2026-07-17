-- client/book: honor the client's own "Choose your team" pick.
--
-- create_booking_atomic (2026_07_13_client_book_dedupe_atomic.sql) hardcoded
-- team_member_id to NULL in its INSERT. The route never had a way to pass
-- one through even though the live self-booking UI (nycmaid/book/new,
-- template/book/new, the-florida-maid/book-now) already lets a client pick
-- a lead cleaner + extras — cleaner_id/extra_cleaner_ids were collected by
-- the form and sent to POST /api/client/book, then silently discarded on
-- arrival, every time, in favor of manual admin assignment. Same shape as
-- the /api/client/recurring gap fixed the same session.
--
-- Adds p_team_member_id with a DEFAULT NULL so this is backward compatible
-- with any caller that doesn't pass it (none currently do besides this one
-- route, per repo-wide grep for create_booking_atomic).
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_tenant_id uuid,
  p_client_id uuid,
  p_property_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_service_type text,
  p_price numeric,
  p_hourly_rate numeric,
  p_team_size int,
  p_is_emergency boolean,
  p_max_hours numeric,
  p_notes text,
  p_recurring_type text,
  p_team_member_token text,
  p_token_expires_at timestamptz,
  p_referrer_id uuid,
  p_ref_code text,
  p_day_start timestamptz,
  p_day_end timestamptz,
  p_active_statuses text[],
  p_team_member_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_existing int;
  v_booking jsonb;
BEGIN
  -- Lock the client row for the duration of this transaction: concurrent
  -- create_booking_atomic calls for the same client serialize here.
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
    referrer_id, ref_code
  ) VALUES (
    p_tenant_id, p_client_id, p_property_id, p_team_member_id, p_start_time, p_end_time,
    p_service_type, 'pending', p_price, p_hourly_rate, p_team_size, p_is_emergency,
    p_max_hours, p_notes, p_recurring_type, p_team_member_token, p_token_expires_at,
    p_referrer_id, p_ref_code
  )
  RETURNING to_jsonb(bookings.*) INTO v_booking;

  RETURN jsonb_build_object('created', true, 'booking', v_booking);
END;
$$;
