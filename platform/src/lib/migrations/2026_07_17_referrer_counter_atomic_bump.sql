-- Atomic increment for referrers.total_earned/total_paid — closes a
-- read-then-write lost-update race, same shape as cpa_token_bump_usage
-- (039_atomic_ledger_and_hardening.sql) and today's merge_tenant_seats fix.
--
-- referral_commissions.status already has an atomic CAS (.neq('status','paid'))
-- so double-submitting the SAME commission can't double-credit. But two
-- DIFFERENT commissions for the SAME referrer created/paid concurrently
-- (e.g. two cleaners checking out two of that referrer's bookings back to
-- back, or an admin marking two pending commissions paid in quick
-- succession) both read the same stale referrers.total_earned/total_paid
-- and the second write clobbers the first — the referrer's ledger silently
-- undercounts by one commission's worth, with no error surfaced anywhere.
--
-- FILE ONLY — not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it.

CREATE OR REPLACE FUNCTION bump_referrer_total_earned(p_referrer_id UUID, p_tenant_id UUID, p_amount_cents INTEGER) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE referrers
  SET total_earned = total_earned + p_amount_cents
  WHERE id = p_referrer_id AND tenant_id = p_tenant_id;
$$;

GRANT EXECUTE ON FUNCTION bump_referrer_total_earned(UUID, UUID, INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION bump_referrer_total_paid(p_referrer_id UUID, p_tenant_id UUID, p_amount_cents INTEGER) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE referrers
  SET total_paid = total_paid + p_amount_cents
  WHERE id = p_referrer_id AND tenant_id = p_tenant_id;
$$;

GRANT EXECUTE ON FUNCTION bump_referrer_total_paid(UUID, UUID, INTEGER) TO authenticated, service_role;
