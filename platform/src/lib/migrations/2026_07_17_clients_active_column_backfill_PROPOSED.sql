-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Context: same shape as
-- 2026_07_17_team_members_active_column_backfill_PROPOSED.sql, flagged as an
-- open follow-up in deploy-prep/w4-broad-hunt-2026-07-17-0128 but not
-- written until now. `clients.active` is a real, live column (added by the
-- same one-time NYC Maid legacy-data-parity import as team_members.active)
-- but nothing in the app writes it, so it has drifted from `status` (the
-- field every real write path -- client edit, DNS flagging, etc. -- actually
-- maintains). Live sample verified read-only against production: of 957
-- rows, 439 have status='inactive', but only 13 of those also have
-- active=false. 426 inactive clients still read active=true.
--
-- This session (01:33 queue) closed the last known live readers of the raw
-- column: Selena's getClientProfile tool (src/lib/selena/core.ts,
-- src/lib/selena-legacy.ts, and the 3 per-tenant clone copies under
-- src/app/site/{wash-and-fold-nyc,wash-and-fold-hoboken,nyc-mobile-salon}/
-- _lib/selena.ts) were feeding the raw `active` column into the AI's
-- tool-call context as a client's active/inactive flag -- wrong ~44% of the
-- time for genuinely inactive clients. All 5 now derive
-- `status !== 'inactive'` instead. Reconfirm with a repo-wide grep for
-- `client.active`/`c.active`/`.select(...active...)` against the clients
-- table before applying, in case a new consumer was added since.
--
-- Two options for Jeff to choose between (mirrors the team_members file):
--
-- Option A (recommended): backfill from status, then drop the column.
DO $$
BEGIN
  UPDATE clients SET active = (status <> 'inactive') WHERE active IS DISTINCT FROM (status <> 'inactive');
END $$;

ALTER TABLE clients DROP COLUMN IF EXISTS active;

-- Option B (if `active` is wanted as a going-forward field): keep the
-- column, backfill it once from status, and add a trigger to keep it in
-- sync going forward. Comment out Option A above and uncomment this block
-- instead.
--
-- UPDATE clients SET active = (status <> 'inactive') WHERE active IS DISTINCT FROM (status <> 'inactive');
--
-- CREATE OR REPLACE FUNCTION clients_sync_active() RETURNS trigger AS $sync$
-- BEGIN
--   NEW.active := (NEW.status <> 'inactive');
--   RETURN NEW;
-- END;
-- $sync$ LANGUAGE plpgsql;
--
-- DROP TRIGGER IF EXISTS trg_clients_sync_active ON clients;
-- CREATE TRIGGER trg_clients_sync_active
--   BEFORE INSERT OR UPDATE OF status ON clients
--   FOR EACH ROW EXECUTE FUNCTION clients_sync_active();
