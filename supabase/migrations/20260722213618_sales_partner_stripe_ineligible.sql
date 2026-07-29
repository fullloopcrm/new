-- Adopted from legacy hand-run migration: 2026_07_22_sales_partner_stripe_ineligible.sql
-- Original commit date (git first-add): 2026-07-22T17:36:18-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 2026_07_22_sales_partner_stripe_ineligible.sql
-- Admin-only escape hatch for the mandatory-Stripe-Connect payout rule
-- (CHANNEL.md 16:35 mandate, 16:55 answer on the ineligible-partner edge
-- case): manual Zelle/Apple Cash payout is no longer offered by default to a
-- sales partner who simply hasn't connected Stripe yet -- it's only
-- reachable for a partner an admin has explicitly flagged as unable to
-- complete Connect onboarding (e.g. ineligible country/entity).
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_22_sales_partner_stripe_ineligible.sql
-- NOT YET APPLIED TO PROD -- gated on Jeff's explicit go per CHANNEL.md.

BEGIN;

ALTER TABLE sales_partners
  ADD COLUMN IF NOT EXISTS stripe_ineligible boolean NOT NULL DEFAULT false;

COMMIT;
