-- 068_tenant_domains_type_geo.backfill.sql
-- P1 schema lane (W1). Backfills `type` on every existing tenant_domains row
-- from the existing `is_primary` boolean (the only signal we have — every row
-- predates the `type` column). MUST run AFTER 068 and BEFORE 069.
--
-- `neighborhood` / `zip_codes` are deliberately NOT backfilled here — see
-- 068_tenant_domains_type_geo.sql's header. There is no per-tenant zip/
-- neighborhood dataset in this repo to backfill from; asserting a guess would
-- be worse than leaving them NULL (getDomainsForNeighborhood/
-- getNeighborhoodFromZip already treat NULL/no-match as "no neighborhood
-- data", which is the truthful state).
--
-- Mapping: is_primary = true  -> type = 'primary'
--          is_primary = false -> type = 'generic'
-- 'neighborhood' is never assigned by this backfill (no signal for it from
-- is_primary alone) — it is only ever set by a future pass that actually has
-- zip/neighborhood data to attach. Idempotent: guarded by `type is null`, so
-- re-running never clobbers a manual correction.
update tenant_domains
set type = case when is_primary then 'primary' else 'generic' end
where type is null;

-- ── Verification (LEADER ORDER 11:57 pattern) — every row must now have a
-- non-null type, since is_primary is itself NOT NULL and the CASE above is
-- total over {true, false}. If this ever fails, some row bypassed the boolean
-- (a schema drift on is_primary) — fail loud rather than let 069 silently
-- half-enforce.
do $$
declare
  missing bigint;
begin
  select count(*) into missing from tenant_domains where type is null;

  if missing > 0 then
    raise exception
      'tenant_domains type backfill FAILED: % row(s) still have type IS NULL after backfill (is_primary must be NOT NULL for every row). Investigate before running 069.',
      missing;
  end if;

  raise notice 'tenant_domains type backfill PASSED: all rows now have a non-null type.';
end $$;
