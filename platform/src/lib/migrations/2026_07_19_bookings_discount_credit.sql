-- 2026_07_19_bookings_discount_credit.sql
-- Admin-set booking discount + one-time credit, ported from nycmaid commits
-- 6ec48424 (discount_type/discount_value + one_time_credit_cents/reason
-- schema, applyDiscount/applyCredit money-path wiring) and a8efe43f
-- (one-time credit on the create-booking form). fullloopcrm's BookingsAdmin.tsx
-- already had a percent-only discount TOGGLE in the UI (discount_enabled/
-- discount_percent) but never persisted it to the bookings row -- it was
-- baked into `price` once at submission and lost on every recompute
-- (post-checkout edit, actual_hours entry, Stripe webhook, 30-min alert),
-- exactly the bug nycmaid's commit describes. discount_type is intentionally
-- omitted (unlike nycmaid) -- fullloopcrm's discount UI is percent-only, no
-- dollar-amount discount type exists here, so there is nothing to persist a
-- type for.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_19_bookings_discount_credit.sql

BEGIN;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS discount_percent numeric,
  ADD COLUMN IF NOT EXISTS one_time_credit_cents integer,
  ADD COLUMN IF NOT EXISTS one_time_credit_reason text;

-- Recurring schedules carry the STANDING discount only -- one_time_credit is
-- deliberately excluded here (and gated off client-side whenever repeat_enabled
-- is on), since a "one-time" credit copied onto every future cron-generated
-- occurrence would silently become a permanent discount instead of a comp for
-- a single visit.
ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS discount_percent numeric;

COMMIT;
