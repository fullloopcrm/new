-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Context: several sessions' worth of deploy-prep notes (culminating in
-- commit e33f55ef) assumed team_members.active did not exist as a column,
-- based on schema.sql (a stale base snapshot missing dozens of since-applied
-- columns) plus an incomplete migration grep. Verified live against
-- production (read-only GET against the PostgREST API) that the column DOES
-- exist -- added by 010_nycmaid_parity_columns_2.sql, a one-time NYC Maid
-- legacy-data-parity import, commit message "applied to prod".
--
-- The real bug was narrower: nothing in the app writes team_members.active,
-- so it silently drifted from `status` (the field the HR termination flow
-- and everything else actually maintains). Live sample of 50 rows:
--   39 status=active/active=true   (agree)
--    5 status=inactive/active=false (agree)
--    5 status=active/active=false   (DISAGREE)
--    1 status=inactive/active=true  (DISAGREE -- a terminated employee still
--                                     showing active=true to any reader that
--                                     trusted the stale column)
-- This session switched every live reader from `active` to `status` (the
-- reliably-maintained field) -- that fix stands regardless of the corrected
-- root-cause understanding above.
--
-- This migration is the cleanup: it does NOT change any behavior on its own
-- (nothing reads `active` anymore after this session's fixes -- reconfirm
-- with a repo-wide grep before applying, in case a new consumer was added
-- since). It exists to stop the column from being a live landmine for a
-- future session that greps for "active" against team_members, finds a real
-- column, and reasonably assumes it's meaningful.
--
-- Two options for Jeff to choose between (this file proposes option A but
-- either is a one-line change):
--
-- Option A (recommended): backfill from status, then drop the column.
-- Removes the redundant, unmaintained field entirely.
DO $$
BEGIN
  UPDATE team_members SET active = (status <> 'inactive') WHERE active IS DISTINCT FROM (status <> 'inactive');
END $$;

ALTER TABLE team_members DROP COLUMN IF EXISTS active;

-- Option B (if `active` is wanted as a going-forward field, e.g. some future
-- integration expects it): keep the column, backfill it once from status,
-- and add a trigger to keep it in sync going forward. Comment out Option A
-- above and uncomment this block instead.
--
-- UPDATE team_members SET active = (status <> 'inactive') WHERE active IS DISTINCT FROM (status <> 'inactive');
--
-- CREATE OR REPLACE FUNCTION team_members_sync_active() RETURNS trigger AS $sync$
-- BEGIN
--   NEW.active := (NEW.status <> 'inactive');
--   RETURN NEW;
-- END;
-- $sync$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS trg_team_members_sync_active ON team_members;
-- CREATE TRIGGER trg_team_members_sync_active
--   BEFORE INSERT OR UPDATE OF status ON team_members
--   FOR EACH ROW EXECUTE FUNCTION team_members_sync_active();
