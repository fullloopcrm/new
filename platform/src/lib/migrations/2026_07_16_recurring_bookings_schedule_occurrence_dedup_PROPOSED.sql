-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a duplicate-occurrence race in cron/generate-recurring (weekly cron,
-- src/app/api/cron/generate-recurring/route.ts).
--
-- For each active recurring_schedules row, the cron finds the LATEST booking
-- already generated for that schedule (`bookings.schedule_id`), decides how
-- many new weeks to fill in from there, and INSERTs the new occurrence rows.
-- That "find latest, then insert the gap" is check-then-act with no DB
-- constraint backing schedule_id+start_time uniqueness at all. Two
-- overlapping invocations of this cron (a slow run that hasn't finished by
-- the next scheduled trigger, a manual re-trigger while one is in flight, a
-- platform-level retry on a timeout) both read the SAME latest booking for a
-- given schedule before either INSERT commits, and both generate and insert
-- the IDENTICAL batch of future occurrence dates for that schedule.
--
-- This is real-world load-bearing for the dumpster/junk/moving recurring-
-- pickup-contract archetype (and every other trade's standing weekly/biweekly
-- service): the result is duplicate future bookings for the same contract on
-- the same dates — double team-member assignment/SMS per occurrence, and (if
-- invoicing is ever derived per-booking for recurring contracts) double
-- billing for one real pickup.
--
-- Fix: a partial unique index on (schedule_id, start_time), scoped to rows
-- that actually belong to a recurring schedule (manual one-off bookings have
-- schedule_id IS NULL and are untouched). route.ts's existing per-row insert
-- fallback (56a53d3a, added to survive the fn_block_booking_overlap trigger
-- without silent batch loss) already catches insert errors per occurrence —
-- updated in the same commit to treat this index's 23505 (unique_violation)
-- as an idempotent "already generated" no-op instead of lumping it in with
-- the trigger's exclusion_violation "needs manual scheduling" alert, so the
-- losing cron invocation doesn't send a false "occurrence skipped" notice
-- for an occurrence the winning invocation already created successfully.

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookings_schedule_occurrence
  ON bookings (schedule_id, start_time)
  WHERE schedule_id IS NOT NULL;
