-- Recurring intent carried on a quote/proposal, so a sold RECURRING service
-- (weekly cleaning, monthly pest, etc.) spins up a recurring_schedules series
-- on close instead of a single one-off booking.
--
-- recurring_type NULL  => one-off (existing behavior, unchanged).
-- recurring_type set   => on accept/close, create a recurring_schedules series
--                         (see src/lib/sale-to-recurring.ts) + initial bookings.

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS recurring_type TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS recurring_start_date DATE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS recurring_preferred_time TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS recurring_duration_hours NUMERIC;
-- Idempotency marker for the recurring close path (mirrors converted_job_id /
-- converted_booking_id). Points at the recurring_schedules row we created.
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS converted_schedule_id UUID
  REFERENCES recurring_schedules(id) ON DELETE SET NULL;

-- Fulfillment routing: does a sold quote become a BOOKING (service → Bookings)
-- or a JOB/project (→ Job board)? NULL = project (current default behavior).
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS fulfillment_type TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'quotes' AND constraint_name = 'quotes_fulfillment_type_chk'
  ) THEN
    ALTER TABLE quotes ADD CONSTRAINT quotes_fulfillment_type_chk
      CHECK (fulfillment_type IS NULL OR fulfillment_type IN ('booking', 'project'));
  END IF;
END $$;

-- Guard: only allow known cadences (matches RecurringType in src/lib/recurring.ts).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'quotes' AND constraint_name = 'quotes_recurring_type_chk'
  ) THEN
    ALTER TABLE quotes ADD CONSTRAINT quotes_recurring_type_chk
      CHECK (recurring_type IS NULL OR recurring_type IN
        ('weekly','biweekly','triweekly','monthly_date','monthly_weekday'));
  END IF;
END $$;
