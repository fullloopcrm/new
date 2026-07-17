-- Migration 063: reconcile push_subscriptions — two conflicting CREATE TABLE
-- IF NOT EXISTS statements exist in this repo's own migration history for the
-- SAME table name, and every current application query uses the columns from
-- only one of them:
--
--   src/lib/migrations/008_missing_tables_and_columns.sql (undated, numbered
--   track):
--     push_subscriptions(id, tenant_id, user_type, user_id, subscription,
--     created_at), UNIQUE(tenant_id, user_type, user_id)
--
--   migrations/2026_05_19_remaining_tables.sql (dated track, applied later if
--   both ran in file order):
--     push_subscriptions(id, tenant_id, endpoint, subscription, role,
--     client_id, team_member_id, created_at, updated_at),
--     UNIQUE(tenant_id, endpoint), plus role/client/team_member indexes.
--
-- `CREATE TABLE IF NOT EXISTS` is a silent no-op against an existing table of
-- a DIFFERENT shape — it does not ALTER it. If 008 ran first, the live table
-- is stuck on the OLD (user_type/user_id) shape, and 2026_05_19's version
-- never actually landed.
--
-- Every current caller — src/lib/push.ts (sendPushToTenantAdmins/
-- sendPushToTeamMember/sendPushToClient/sendPushToAllTeamMembers/
-- sendPushToPlatformAdmin) and src/app/api/push/subscribe/route.ts (POST/
-- DELETE) — reads and writes ONLY `endpoint`, `role`, `client_id`,
-- `team_member_id`, `updated_at`. None of them ever reference `user_type` or
-- `user_id`. If the live table is still on the 008 shape, every one of these
-- queries has been erroring at the DB layer (column does not exist) since
-- inception — meaning web push may never have worked at all, independent of
-- the separate notify()-channel gap fixed in this same session (see
-- EMERGENCY-24-7-ARCHETYPE-GAPS-AND-FRICTION-2026-07-16.md item 53).
--
-- This migration is written to be safe EITHER WAY: every statement is
-- additive (ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / ADD
-- CONSTRAINT guarded by a NOT EXISTS check), so it is a no-op if the
-- 2026_05_19 shape already won, and a repair if the 008 shape won.
--
-- Deliberately NOT included, and left as a PRE-run manual check instead of an
-- automated step:
--   1. `endpoint`/`role` as NOT NULL. The 2026_05_19 file declares both
--      NOT NULL, but blindly adding a NOT NULL column to a table that may
--      already hold old-shape rows (endpoint/role absent on those rows)
--      would fail outright. Added nullable here; tighten to NOT NULL only
--      after confirming (via the PRE query below) how many existing rows
--      would violate it, and backfilling or deleting them first.
--   2. The 2026_05_19 file's CHECK (role IN ('admin','cleaner','client')) —
--      note it says 'cleaner', but every current app write
--      (src/app/api/push/subscribe/route.ts's `effectiveRole`) writes
--      'team_member', not 'cleaner' — the same nycmaid-era-naming mismatch
--      class as item (6) in the gap doc above, just baked into a DB
--      constraint instead of application code. If that CHECK constraint
--      exists live, EVERY team-member push subscribe call has been rejected
--      by Postgres. This migration does not touch it — dropping/altering an
--      unknown constraint name programmatically without seeing the live
--      `pg_constraint` row first is exactly the kind of guess this repo's
--      standing rules say not to make. Run the PRE query below first; if it
--      finds a role CHECK missing 'team_member', that is a separate,
--      reviewed ALTER (drop + recreate the CHECK) — not bundled here.

-- PRE (informational, read-only — run before applying, not part of the DDL):
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'push_subscriptions'
--   ORDER BY ordinal_position;
--   -- if this returns user_type/user_id and NOT endpoint/role/client_id/
--   -- team_member_id, the table is on the stale 008 shape and this
--   -- migration is needed.
--
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conrelid = 'public.push_subscriptions'::regclass AND contype = 'c';
--   -- check whether an existing CHECK on `role` excludes 'team_member'.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS endpoint TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Supporting indexes the app's read paths rely on (sendPushToTeamMember
-- filters on team_member_id, sendPushToClient on client_id, the tenant-admin
-- and all-team-members paths on tenant_id + role).
CREATE INDEX IF NOT EXISTS idx_push_subs_tenant_role ON push_subscriptions(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_push_subs_client ON push_subscriptions(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subs_team_member ON push_subscriptions(team_member_id) WHERE team_member_id IS NOT NULL;

-- The subscribe route's upsert-by-endpoint logic (POST /api/push/subscribe)
-- depends on this uniqueness to detect "already subscribed" vs. "new
-- device". Guarded so it doesn't error if it already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.push_subscriptions'::regclass
      AND contype = 'u'
      AND conname = 'push_subscriptions_tenant_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions
      ADD CONSTRAINT push_subscriptions_tenant_endpoint_key UNIQUE (tenant_id, endpoint);
  END IF;
END $$;

-- POST (informational, read-only — run after applying):
--   SELECT count(*) FILTER (WHERE endpoint IS NULL) AS still_missing_endpoint,
--          count(*) FILTER (WHERE role IS NULL) AS still_missing_role,
--          count(*) AS total_rows
--   FROM push_subscriptions;
--   -- Any pre-008-shape rows will show up here as endpoint/role NULL — they
--   -- are dead weight (no working endpoint to push to) and candidates for
--   -- deletion once confirmed, not automatically deleted by this migration.
