-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Sibling of 2026_07_16_referrer_total_earned_atomic_bump_PROPOSED.sql --
-- same lost-update class, one level deeper in the same flow.
--
-- PUT /api/referral-commissions (src/app/api/referral-commissions/route.ts)
-- already has an atomic claim on the commission row's own status transition
-- (`.neq('status', 'paid')` -- see the comment above it, fixed this session)
-- so a double-click/retry of "mark paid" for the SAME commission id cannot
-- double-credit total_paid. But immediately after that claim, it still does
-- a plain read-then-write on the referrer's total_paid:
--   const { data: ref } = await ...select('total_paid')...
--   await ...update({ total_paid: (ref.total_paid || 0) + claimed.commission_cents })
--
-- If an admin marks TWO DIFFERENT commissions paid for the SAME referrer in
-- quick succession (a realistic admin workflow -- batch-clearing a payout
-- run), both PUT requests can read the same starting total_paid before
-- either write lands; the second write clobbers the first's increment. The
-- claimed commission rows themselves are correct (each independently
-- transitioned to 'paid' with its own paid_at/paid_via), but the referrer's
-- displayed total_paid (surfaced in tax-export and finance/reports, and
-- used to compute total_pending = total_earned - total_paid on the referrer
-- portal) undercounts -- looks like less was paid out than actually was.
--
-- NOT wired into route.ts yet -- calling an undefined RPC before this
-- migration runs would error the mark-paid action. Once applied, replace
-- the `.update({ total_paid: (ref.total_paid || 0) + claimed.commission_cents })`
-- block with `.rpc('referrer_bump_total_paid', { p_referrer_id: claimed.referrer_id,
-- p_amount_cents: claimed.commission_cents })`.

CREATE OR REPLACE FUNCTION referrer_bump_total_paid(p_referrer_id UUID, p_amount_cents BIGINT) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE referrers
  SET total_paid = COALESCE(total_paid, 0) + p_amount_cents
  WHERE id = p_referrer_id;
$$;

GRANT EXECUTE ON FUNCTION referrer_bump_total_paid(UUID, BIGINT) TO authenticated, service_role;
