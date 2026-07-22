-- 2026_07_22_referrer_stripe_ineligible.sql
-- Per leader/Jeff's 16:55 answer (CHANNEL.md) on the ineligible-referrer edge
-- case: manual Zelle/Apple Cash payout is mandatory-replaced by Stripe
-- Connect for every referrer who CAN connect, but a referrer who genuinely
-- can't (ineligible country/entity, etc.) still needs a payout path. That
-- path is admin-flagged per-referrer, not a default option anyone can pick.
-- Additive/nullable only.
-- NOT YET RUN AGAINST PROD -- only the 2026_07_22_referrer_stripe_connect.sql
-- migration was pre-authorized for this task; this one needs its own gate
-- confirmation (flagged in CHANNEL.md).
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_22_referrer_stripe_ineligible.sql

BEGIN;

ALTER TABLE referrers
  ADD COLUMN IF NOT EXISTS stripe_ineligible_at timestamptz;

COMMIT;
