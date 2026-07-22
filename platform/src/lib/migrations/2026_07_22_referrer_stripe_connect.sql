-- 2026_07_22_referrer_stripe_connect.sql
-- Stripe Connect for referrers (global Connect rollout, W3 lane). Mirrors
-- sales_partners.stripe_connect_account_id + stripe_ready_at
-- (2026_07_18_sales_partners.sql) so referral_commissions payouts can move
-- to a Connect transfer, same pattern as sales partners and team members.
-- Additive/nullable only — referrers who never connect Stripe keep using
-- the existing manual Zelle/Apple Cash payout fields untouched.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_22_referrer_stripe_connect.sql

BEGIN;

ALTER TABLE referrers
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_ready_at timestamptz;

COMMIT;
