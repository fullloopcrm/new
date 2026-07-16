-- 067_unique_self_book_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: POST /api/client/book (the PUBLIC, unauthenticated self-service
-- booking form) has a "one active booking per client per day" gate:
--
--   SELECT count(*) FROM bookings WHERE tenant_id=? AND client_id=?
--     AND start_time BETWEEN <day start> AND <day end>
--     AND status IN ('scheduled','pending','confirmed','in_progress')
--   -> if count > 0, reject with 409 'You already have a booking on this date.'
--
-- This is check-then-insert with no DB backstop. Two concurrent POSTs for
-- the same client+day (a double-tapped Submit button on a slow connection,
-- or a client opening the booking form in two tabs) both pass the SELECT
-- before either INSERT commits -- two duplicate bookings land, defeating
-- the gate's entire purpose (duplicate staff dispatch, duplicate
-- confirmation emails/SMS, a duplicate 'deals' pipeline row per the
-- mirror-insert at the end of that route).
--
-- FIX SHAPE: intentionally NOT a blanket unique index on
-- (tenant_id, client_id, day) across all of `bookings` -- POST /api/bookings
-- (the authenticated admin/dashboard create route) has NO such one-per-day
-- rule and legitimately allows multiple same-day bookings for one client
-- (e.g. two properties serviced same day). A table-wide constraint would
-- silently break that admin flow. Instead: a new nullable
-- self_book_dedup_key column, set ONLY by the public self-book route to
-- `${client_id}:${YYYY-MM-DD}`, with a partial unique index scoped to that
-- column AND the same active-status list the app already checks -- so it
-- self-heals the moment a booking's status leaves that set (cancel/no_show/
-- complete), exactly matching the existing SELECT gate's semantics, and
-- never touches admin-created rows (which leave the column NULL).
--
-- route.ts (same commit) sets self_book_dedup_key on insert and catches
-- 23505 to return the same 409 message as the existing SELECT-based check,
-- so a losing concurrent request gets the correct user-facing error instead
-- of an unhandled 500.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS self_book_dedup_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_self_book_dedup_unique
  ON bookings(tenant_id, self_book_dedup_key)
  WHERE self_book_dedup_key IS NOT NULL
    AND status IN ('scheduled', 'pending', 'confirmed', 'in_progress');
