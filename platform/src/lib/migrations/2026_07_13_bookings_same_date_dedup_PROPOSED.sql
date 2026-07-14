-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a same-day double-booking race on POST /api/client/book.
--
-- The route's "same-date duplicate" gate (added to stop a client from
-- accidentally booking twice on one day) is a plain
-- `SELECT count(*) ... status IN (active statuses)` check performed BEFORE a
-- separate `INSERT`. That is not atomic: two concurrent requests for the
-- same (tenant_id, client_id, date) — a double-clicked Book button, a client
-- retry after a slow response, or two open tabs — can both read count=0
-- before either INSERT commits, creating TWO active, priced bookings for the
-- same client on the same day. There is currently no DB-level constraint
-- backing this dedup rule at all, so both concurrent inserts simply succeed.
--
-- Fix: a partial unique index on (tenant_id, client_id, date) makes the DB
-- the real source of truth, scoped to the same active statuses the
-- application-level gate already checks. route.ts was updated in the same
-- commit to catch the resulting 23505 on insert and return the existing 409
-- "You already have a booking on this date." instead of a raw 500.

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_client_same_date_active
  ON bookings (tenant_id, client_id, (start_time::date))
  WHERE status IN ('scheduled', 'pending', 'confirmed', 'in_progress');
