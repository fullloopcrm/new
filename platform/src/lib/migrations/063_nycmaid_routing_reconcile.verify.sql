-- 063_nycmaid_routing_reconcile.verify.sql
-- P1 schema lane (W1). Standalone, read-only verification for the flagship
-- (nycmaid) routing reconcile. Everything here reads only; the final DO gate
-- writes NOTHING — it only RAISES. Safe to run any time before/after 063.
--
-- HOW TO RUN (so a failure HALTs with a nonzero exit code):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 063_nycmaid_routing_reconcile.verify.sql
--
-- Identity is slug-agnostic: the flagship is the ONE tenant whose slug is in
-- ('nycmaid', 'the-nyc-maid'). No other tenant claims either slug.

\echo '== 1. Flagship tenant identity (expect EXACTLY one row) =='
select id as tenant_id, slug, domain as tenants_domain
  from tenants
 where slug in ('nycmaid', 'the-nyc-maid')
 order by slug;

\echo '== 2. Flagship domain rows + routing_mode (expect every routing_mode = bespoke) =='
select t.slug, td.domain, td.routing_mode, td.status, td.vercel_project, td.is_primary
  from tenants t
  join tenant_domains td on td.tenant_id = t.id
 where t.slug in ('nycmaid', 'the-nyc-maid')
 order by td.is_primary desc, td.domain;

\echo '== 3. Alias-domain ownership (expect BOTH present, same tenant_id, NOT owned by another tenant) =='
select d.domain,
       td.tenant_id       as owner_tenant_id,
       (select id from tenants where slug in ('nycmaid','the-nyc-maid')) as flagship_tenant_id,
       td.routing_mode
  from (values ('thenycmaid.com'), ('thenewyorkcitymaid.com')) as d(domain)
  left join tenant_domains td on td.domain = d.domain
 order by d.domain;

\echo '== 4. GATE: FAIL LOUD if flagship missing/ambiguous, any alias absent, any alias mis-owned, or any flagship row not bespoke =='
do $$
declare
  v_matches    bigint;
  v_tenant_id  uuid;
  v_missing    bigint;
  v_swap       bigint;
  v_nonbespoke bigint;
  v_domains    text[] := array['thenycmaid.com', 'thenewyorkcitymaid.com'];
begin
  select count(*) into v_matches
    from tenants where slug in ('nycmaid', 'the-nyc-maid');

  if v_matches <> 1 then
    raise exception
      '063 verify FAILED: expected exactly 1 flagship tenant (slug in nycmaid/the-nyc-maid), found %.',
      v_matches;
  end if;

  select id into v_tenant_id
    from tenants where slug in ('nycmaid', 'the-nyc-maid');

  select count(*) into v_missing
    from unnest(v_domains) as d
   where not exists (
     select 1 from tenant_domains td where td.domain = d and td.tenant_id = v_tenant_id
   );

  select count(*) into v_swap
    from tenant_domains
   where domain = any(v_domains) and tenant_id <> v_tenant_id;

  select count(*) into v_nonbespoke
    from tenant_domains
   where tenant_id = v_tenant_id and routing_mode is distinct from 'bespoke';

  raise notice '063 verify: flagship=%, missing_alias=%, mis_owned_alias=%, non_bespoke_rows=%',
    v_tenant_id, v_missing, v_swap, v_nonbespoke;

  if v_missing > 0 or v_swap > 0 or v_nonbespoke > 0 then
    raise exception
      '063 verify FAILED: missing_alias=%, mis_owned_alias=%, non_bespoke_rows=%. See sections 2 and 3 above.',
      v_missing, v_swap, v_nonbespoke;
  end if;

  raise notice
    '063 verify PASSED: flagship % has both alias domains and every domain row routes bespoke.',
    v_tenant_id;
end $$;
