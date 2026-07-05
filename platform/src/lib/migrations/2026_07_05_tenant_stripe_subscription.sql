-- Store the Stripe subscription id on each tenant so seat changes can sync
-- per-seat quantities to the live subscription (proration handled by Stripe).
-- Applied to prod via the Supabase Management API on 2026-07-05.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
