-- Support a new recurring_type, 'weekly_days' — a client wants a recurring
-- schedule on specific days each week (e.g. Mon/Wed/Fri) rather than the
-- existing single-anchor-day/interval types (weekly/biweekly/triweekly/
-- monthly_date/monthly_weekday/custom). Admin/staff dashboard only (Bookings
-- + Find a Team Member's create/edit forms) — see src/lib/recurring.ts and
-- src/app/dashboard/bookings/_recurring.ts for the date-generation logic.
--
-- days_of_week stores 0=Sun..6=Sat, matching the existing day_of_week
-- column's convention. Added to BOTH tables: recurring_schedules (read by
-- cron/generate-recurring's refill) and bookings (denormalized onto every
-- generated row, same pattern recurring_type already uses, so the edit form
-- can prefill the day picker for an existing series without an extra
-- fetch/join).
ALTER TABLE recurring_schedules ADD COLUMN IF NOT EXISTS days_of_week integer[];
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS days_of_week integer[];
