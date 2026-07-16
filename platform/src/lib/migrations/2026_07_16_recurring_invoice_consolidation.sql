-- 2026_07_16_recurring_invoice_consolidation.sql
-- W1 build (P1 refill queue): commercial/office recurring accounts expect one
-- monthly rollup statement, not a standalone invoice per visit. Today every
-- invoice is generated one-at-a-time from a single booking (POST /api/invoices
-- from_booking_id, src/app/api/invoices/route.ts) — there is no concept of
-- "these N completed visits belong on one invoice" anywhere in the schema.
--
-- Additive, nullable-first, no backfill required — existing invoices/bookings
-- keep their current per-visit behavior untouched (invoice_consolidation
-- defaults every EXISTING and new schedule to 'per_visit', the status quo).

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS invoice_consolidation TEXT NOT NULL DEFAULT 'per_visit'
    CHECK (invoice_consolidation IN ('per_visit', 'monthly'));

-- Links a rollup invoice back to the schedule it was generated from. Nullable
-- — per-visit invoices (the existing booking_id/quote_id/standalone paths)
-- never set this.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_recurring_schedule
  ON invoices (recurring_schedule_id)
  WHERE recurring_schedule_id IS NOT NULL;

-- Back-reference so a booking can be marked "already invoiced" regardless of
-- whether it was billed standalone (booking_id) or folded into a monthly
-- rollup (recurring_schedule_id) — the monthly generator queries this to
-- avoid ever billing the same completed visit twice.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_invoice
  ON bookings (invoice_id)
  WHERE invoice_id IS NOT NULL;

-- Fast lookup for the monthly generator: completed, not-yet-invoiced
-- bookings for a given schedule.
CREATE INDEX IF NOT EXISTS idx_bookings_schedule_uninvoiced
  ON bookings (schedule_id, status)
  WHERE invoice_id IS NULL;
