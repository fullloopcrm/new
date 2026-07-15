-- referrers.total_earned / total_paid: close a lost-update race.
--
-- Three call sites (team-portal/checkout, referral-commissions POST/PUT) all
-- did a read-then-write: SELECT the referrer's current total_earned/
-- total_paid, compute `current + delta` in JS, then UPDATE with that literal
-- value. Two concurrent commission events for the SAME referrer (e.g. two
-- team members checking out two different bookings for clients referred by
-- the same person, around the same time) can both read the same stale total
-- and both write back `stale + delta` — one increment is silently lost and
-- the referrer is permanently under-credited (a real-money ledger bug, not
-- cosmetic).
--
-- Fix: fold the read-increment-write into one atomic UPDATE per ledger field,
-- so concurrent calls for the same referrer serialize on the row's write lock
-- instead of racing on a stale JS-side snapshot.
CREATE OR REPLACE FUNCTION public.increment_referrer_earned(
  p_tenant_id uuid,
  p_referrer_id uuid,
  p_amount_cents bigint
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_total bigint;
BEGIN
  UPDATE public.referrers
  SET total_earned = COALESCE(total_earned, 0) + p_amount_cents
  WHERE id = p_referrer_id AND tenant_id = p_tenant_id
  RETURNING total_earned INTO v_total;

  RETURN jsonb_build_object('total_earned', v_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_referrer_paid(
  p_tenant_id uuid,
  p_referrer_id uuid,
  p_amount_cents bigint
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_total bigint;
BEGIN
  UPDATE public.referrers
  SET total_paid = COALESCE(total_paid, 0) + p_amount_cents
  WHERE id = p_referrer_id AND tenant_id = p_tenant_id
  RETURNING total_paid INTO v_total;

  RETURN jsonb_build_object('total_paid', v_total);
END;
$$;
