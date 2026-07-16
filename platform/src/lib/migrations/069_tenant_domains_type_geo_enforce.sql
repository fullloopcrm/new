-- 069_tenant_domains_type_geo_enforce.sql
-- P1 schema lane (W1). Final phase for the 068 pair: apply NOT NULL and a
-- forward-insert default to `type`, per the same discipline as
-- 056_tenant_domains_routing_enforce.sql.
--
-- PRECONDITION: 068_tenant_domains_type_geo.backfill.sql has run and every
-- tenant_domains row has a non-null type. The guarded block below verifies
-- this and RAISES rather than half-applying.
--
-- neighborhood / zip_codes are DELIBERATELY EXCLUDED from this gate and stay
-- NULLABLE forever (same reasoning as vercel_project in 056) — there is no
-- source of truth to assert a default from, so leaving them NULL is correct,
-- not a gap to close later with a blanket value.
--
-- RUN ORDER (see 068 header): 068 add -> 068 backfill -> 069 enforce (this).

do $$
declare
  missing bigint;
begin
  select count(*) into missing
  from tenant_domains
  where type is null;

  if missing > 0 then
    raise exception
      'Refusing to enforce NOT NULL: % tenant_domains row(s) still have type IS NULL. Run 068_tenant_domains_type_geo.backfill.sql first.',
      missing;
  end if;
end $$;

-- Forward default per the schema's own precedent (routing_mode defaults to
-- the "shared/no special routing" state): new domain rows that omit `type`
-- get 'generic' — the common case for a plain single-domain tenant.
alter table tenant_domains
  alter column type set default 'generic';

alter table tenant_domains
  alter column type set not null;
