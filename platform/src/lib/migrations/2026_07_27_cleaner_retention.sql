-- 2026_07_27_cleaner_retention.sql
--
-- Per-cleaner retention tracking (Jeff, 2026-07-27): which cleaners' clients
-- keep rebooking vs. which cleaners' clients go quiet. Reuses the exact
-- churn definition renurture.ts already computes per client
-- (matchesSegmentBase: no upcoming booking + no active recurring schedule)
-- — this just groups that same signal by team_member_id instead of by
-- client. Computed by lib/nycmaid/cleaner-retention.ts, run from the
-- existing weekly renurture cron (see cron/renurture/route.ts) rather than
-- a DB trigger, since "time has passed with no rebooking" isn't an insert
-- event the way a rating is.
--
-- Unlike avg_rating (satisfaction), this can only ever surface an anomaly
-- ("this cleaner's clients don't come back") — it cannot distinguish a
-- genuinely bad cleaner from one quietly steering clients off-platform.
-- That call stays human.

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS retention_rate       numeric(5,2);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS clients_served       integer NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS clients_retained     integer NOT NULL DEFAULT 0;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS retention_updated_at timestamptz;

COMMENT ON COLUMN team_members.retention_rate IS 'Pct (0-100) of this cleaner''s distinct served clients who are NOT currently churned (no upcoming booking + no active recurring schedule). Recomputed weekly, all-time window.';
COMMENT ON COLUMN team_members.clients_served IS 'Distinct clients this cleaner has completed at least one booking for, all-time.';
COMMENT ON COLUMN team_members.clients_retained IS 'Of clients_served, how many are not currently churned.';
