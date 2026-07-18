-- 2026_07_18_deal_activities_client_id_backfill.sql
-- Backfills deal_activities.client_id (added by
-- 2026_07_18_deal_activities_client_id.sql) for every EXISTING activity row
-- from its parent deal's client_id. MUST run AFTER that file.
--
-- Idempotent: guarded by `client_id is null`, so re-running only fills gaps
-- and never overwrites a value a later write has since set.

update deal_activities da
set client_id = d.client_id
from deals d
where da.deal_id = d.id
  and da.client_id is null
  and d.client_id is not null;

-- ── VERIFICATION (informational, not fail-loud) ─────────────────────────
-- Rows left NULL here are expected wherever the parent deal itself has no
-- client_id (a deal can exist unattached to a client) -- this reports the
-- backfilled count for spot-checking, not a failed-run signal.
do $$
declare
  n_backfilled bigint;
  n_still_null bigint;
begin
  select count(*) into n_backfilled
    from deal_activities
    where client_id is not null;

  select count(*) into n_still_null
    from deal_activities
    where client_id is null;

  raise notice '2026_07_18_deal_activities_client_id_backfill: % row(s) now have client_id, % row(s) remain NULL (parent deal has no client_id)', n_backfilled, n_still_null;
end $$;
