-- Adopted from legacy hand-run migration: 2026_07_22_sales_partner_commission_stripe_transfer.sql
-- Original commit date (git first-add): 2026-07-22T15:45:37-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
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
