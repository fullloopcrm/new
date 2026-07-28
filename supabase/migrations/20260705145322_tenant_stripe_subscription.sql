-- Adopted from legacy hand-run migration: 2026_07_05_tenant_stripe_subscription.sql
-- Original commit date (git first-add): 2026-07-05T10:53:22-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Store the Stripe subscription id on each tenant so seat changes can sync
-- per-seat quantities to the live subscription (proration handled by Stripe).
-- Applied to prod via the Supabase Management API on 2026-07-05.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
