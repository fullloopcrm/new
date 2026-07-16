-- 2026_07_16_quotes_deal_id.sql
-- W1 finding while extending sim-all-trades.ts with deals/pipeline coverage
-- (2026-07-16). quotes.deal_id is read AND written throughout the sales-pipeline
-- code (src/app/api/quotes/route.ts GET filter + POST insert/activity-log,
-- src/app/api/quotes/[id]/send/route.ts, src/app/api/quotes/public/[token]/accept/route.ts
-- deal-stage-advance-on-accept) but no migration in this repo ever adds a
-- deal_id column to the quotes table (026_quotes.sql's CREATE TABLE has no
-- such column, and no later ALTER TABLE quotes adds one either — verified by
-- grepping every migration file). If this column is genuinely absent on prod,
-- every POST /api/quotes call that supplies deal_id has been failing on the
-- insert (PostgREST "column not found"), meaning the deal-to-proposal-to-sale
-- pipeline wiring has never actually worked in production. If a column with
-- this exact shape was instead added out-of-band (untracked), this file is a
-- harmless no-op (IF NOT EXISTS).
--
-- Additive + reversible. Nullable, so it does not change any existing quote's
-- required-field contract; ON DELETE SET NULL mirrors converted_booking_id's
-- existing pattern (a quote should survive its linked deal being deleted).

alter table quotes
  add column if not exists deal_id uuid references deals(id) on delete set null;

-- Matches the GET /api/quotes tenant_id + deal_id query shape exactly.
create index if not exists idx_quotes_tenant_deal
  on quotes (tenant_id, deal_id)
  where deal_id is not null;
