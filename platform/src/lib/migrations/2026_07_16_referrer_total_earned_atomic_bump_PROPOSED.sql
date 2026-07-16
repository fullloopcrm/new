-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a lost-update race on referrers.total_earned. Two call sites --
-- team-portal/checkout/route.ts (cleaner-reported checkout, NYC Maid path)
-- and referral-commissions/route.ts (admin/manual commission creation) --
-- both do the same read-then-write:
--   const { data: ref } = await ...select('total_earned')...
--   await ...update({ total_earned: (ref.total_earned || 0) + commissionCents })
--
-- The referral_commissions ledger rows themselves are safe (UNIQUE(booking_id)
-- makes each commission insert idempotent per booking -- see
-- route.commission-race.test.ts). But total_earned is a separate denormalized
-- running total read from a stale in-memory value fetched earlier in the
-- request. If the SAME referrer earns commissions on two DIFFERENT bookings
-- that check out/get approved concurrently (a common shape for a busy
-- affiliate, not a rare edge case), both requests can read the same starting
-- total_earned before either writes -- the second write clobbers the first's
-- increment instead of adding to it, silently undercounting the referrer's
-- displayed lifetime earnings (shown on the referrer portal pages and in the
-- referral-converted notification/email). No corruption of the underlying
-- ledger (referral_commissions rows are all still correctly inserted) --
-- just a wrong rollup number a real referrer partner sees.
--
-- Same problem class /already/ solved once in this codebase for a different
-- counter: cpa_token_bump_usage (migration 039) replaced a read-then-write
-- use_count increment with a single atomic UPDATE ... SET x = x + n RPC.
-- This mirrors that exact pattern for total_earned.
--
-- NOT wired into either route.ts yet -- calling an undefined RPC before the
-- migration runs would 404/error on every checkout and every manual
-- commission creation. Once applied, both call sites should replace their
-- `.update({ total_earned: (ref.total_earned || 0) + commissionCents })`
-- with `.rpc('referrer_bump_total_earned', { p_referrer_id: ref.id,
-- p_amount_cents: commissionCents })`.

CREATE OR REPLACE FUNCTION referrer_bump_total_earned(p_referrer_id UUID, p_amount_cents BIGINT) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE referrers
  SET total_earned = COALESCE(total_earned, 0) + p_amount_cents
  WHERE id = p_referrer_id;
$$;

GRANT EXECUTE ON FUNCTION referrer_bump_total_earned(UUID, BIGINT) TO authenticated, service_role;
