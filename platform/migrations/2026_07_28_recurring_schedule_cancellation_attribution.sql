-- Smart-scheduling upgrade spec, Part 4 item 2: cancellation-to-cleaner
-- attribution. recurring_schedules.team_member_id is live/mutable — it can
-- be reassigned or unassigned (set null) at any point via PUT, and nothing
-- today snapshots who actually held the relationship at the moment a
-- schedule is cancelled. A retention metric built directly off the live
-- column would misattribute churn if a schedule is reassigned shortly
-- before cancellation, or lose attribution entirely if it's unassigned
-- first. This adds an explicit, immutable-after-write snapshot instead of
-- inferring it from a column that keeps changing.
--
-- Verified against live schema (information_schema.columns) before writing
-- this: recurring_schedules has no existing cancelled_at/cancelled_* column
-- today. Verified against live data: only 'active' (32) and 'cancelled'
-- (34) status values currently in use; 'paused' is supported in app code
-- but unused in prod data as of this writing.

ALTER TABLE recurring_schedules
  ADD COLUMN IF NOT EXISTS cancelled_team_member_id uuid NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz NULL;

-- Backfill team_member_id only, for schedules already cancelled. Safe: team_member_id
-- has never been snapshotted before, so whatever it holds today for a cancelled
-- row is the best (and only) available signal of who was last assigned. Deliberately
-- NOT backfilling cancelled_at with updated_at as a proxy — verified that
-- api/schedules/[id] DELETE (one of the two live cancel paths) never sets
-- updated_at on cancel, so updated_at is not a reliable stand-in for every
-- cancelled row's actual cancellation time. Leaving it null for historical
-- rows is honest; both cancel endpoints set it going forward.
UPDATE recurring_schedules
SET cancelled_team_member_id = team_member_id
WHERE status = 'cancelled' AND cancelled_team_member_id IS NULL;
