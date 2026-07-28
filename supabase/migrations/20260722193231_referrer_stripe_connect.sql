-- Adopted from legacy hand-run migration: 2026_07_22_referrer_stripe_connect.sql
-- Original commit date (git first-add): 2026-07-22T15:32:31-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
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
