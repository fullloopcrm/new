-- 056_tenant_domains_routing_enforce.sql
-- P1 schema lane (W1). Final phase: apply NOT NULL and forward-insert defaults
-- to the columns added in 055, per P1-SCHEMA-SPEC.md.
--
-- PRECONDITION: 055_tenant_domains_routing.backfill.sql has run and every
-- tenant_domains row has non-null routing_mode, vercel_project, and status.
-- The guarded block below verifies this and RAISES rather than half-applying,
-- so a forgotten backfill fails loudly instead of erroring mid-statement.
--
-- RUN ORDER (see 055 header): 055 add -> 055 backfill -> 056 enforce (this).

do $$
declare
  missing bigint;
begin
  select count(*) into missing
  from tenant_domains
  where routing_mode is null
     or vercel_project is null
     or status is null;

  if missing > 0 then
    raise exception
      'Refusing to enforce NOT NULL: % tenant_domains row(s) still unpopulated. Run 055_tenant_domains_routing.backfill.sql first.',
      missing;
  end if;
end $$;

-- Forward defaults per spec: new inserts that omit these get sensible values.
-- routing_mode defaults to 'template' (new tenants use the shared template).
-- status defaults to 'active'. vercel_project gets NO default per spec — every
-- insert must state its serving project explicitly.
alter table tenant_domains
  alter column routing_mode set default 'template';
alter table tenant_domains
  alter column status set default 'active';

-- Enforce NOT NULL now that all existing rows are populated.
alter table tenant_domains
  alter column routing_mode set not null;
alter table tenant_domains
  alter column vercel_project set not null;
alter table tenant_domains
  alter column status set not null;

-- created_at / updated_at were already NOT NULL DEFAULT now() from 055; nothing
-- to enforce here.
