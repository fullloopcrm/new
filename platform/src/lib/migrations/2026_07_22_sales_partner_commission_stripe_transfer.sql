-- 2026_07_22_sales_partner_commission_stripe_transfer.sql
-- Adds the column needed to record a Stripe Connect transfer against a sales
-- partner commission payout (PUT /api/sales-partner-commissions with
-- paid_via:'stripe_connect'). Purely additive -- existing manual (Zelle/Apple
-- Cash) payout rows are unaffected; stripe_transfer_id stays NULL for those.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_22_sales_partner_commission_stripe_transfer.sql
-- NOT YET APPLIED TO PROD -- gated on Jeff's explicit go per CHANNEL.md.

BEGIN;

ALTER TABLE sales_partner_commissions
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

COMMIT;
