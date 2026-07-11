-- 055_tenant_domains_routing.verify.sql
-- P1 schema lane (W1). LEADER ORDER (11:57): standalone, re-runnable
-- verification that EVERY tenants.domain has a corresponding tenant_domains row
-- pointing at the SAME tenant_id. Everything here is read-only except the final
-- DO gate, which writes NOTHING — it only RAISES. Safe to run any time after
-- the 055 backfill (and again after 056).
--
-- HOW TO RUN (so a failure HALTs with a nonzero exit code):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 055_tenant_domains_routing.verify.sql
--
-- tenant_domains.domain is UNIQUE, so each tenants.domain (non-empty) falls into
-- exactly one bucket:
--   matched   — a tenant_domains row exists with the same domain AND tenant_id
--   mismatch  — a tenant_domains row exists for that domain but a DIFFERENT
--               tenant_id (the cross-tenant swap hazard the P3 tests guard)
--   orphan    — no tenant_domains row exists for that domain at all
-- The backfill (055 ... .backfill.sql) STEP 0 seeds a row per tenants.domain, so
-- after it runs orphans should be 0 and mismatches should be 0.

\echo '== 1. MATCHED count (tenants.domain with a tenant_domains row at the same tenant_id) =='
select count(*) as matched
  from tenants t
  join tenant_domains td on td.domain = t.domain and td.tenant_id = t.id
 where t.domain is not null and t.domain <> '';

\echo '== 2. ORPHANS (tenants.domain with NO tenant_domains row for that domain) — expect 0 rows =='
select t.id as tenant_id, t.slug, t.domain
  from tenants t
 where t.domain is not null and t.domain <> ''
   and not exists (select 1 from tenant_domains td where td.domain = t.domain)
 order by t.slug;

\echo '== 3. MISMATCHES (tenant_domains row for that domain points at a DIFFERENT tenant) — expect 0 rows =='
select t.id  as tenants_tenant_id,
       t.slug,
       t.domain,
       td.id as tenant_domains_id,
       td.tenant_id as tenant_domains_tenant_id
  from tenants t
  join tenant_domains td on td.domain = t.domain
 where t.domain is not null and t.domain <> '' and td.tenant_id <> t.id
 order by t.domain;

\echo '== 4. DIAGNOSTIC only (NOT a failure): orphans that WOULD match under www/case-insensitive compare =='
-- Surfaces storage drift (a www. prefix or casing difference) that exact match
-- treats as an orphan but that almost certainly refers to the same domain.
-- Informational — these do NOT fail the gate below; they flag data to clean.
select t.id as tenant_id, t.slug,
       t.domain  as tenants_domain,
       td.domain as tenant_domains_domain
  from tenants t
  join tenant_domains td
    on lower(regexp_replace(td.domain, '^www\.', '')) = lower(regexp_replace(t.domain, '^www\.', ''))
   and td.domain <> t.domain
 where t.domain is not null and t.domain <> ''
 order by t.domain;

\echo '== 5. GATE: FAIL LOUD (nonzero / HALT) if any orphan or mismatch =='
do $$
declare
  matched    bigint;
  orphans    bigint;
  mismatches bigint;
begin
  select count(*) into matched
    from tenants t
    join tenant_domains td on td.domain = t.domain and td.tenant_id = t.id
   where t.domain is not null and t.domain <> '';

  select count(*) into orphans
    from tenants t
   where t.domain is not null and t.domain <> ''
     and not exists (select 1 from tenant_domains td where td.domain = t.domain);

  select count(*) into mismatches
    from tenants t
    join tenant_domains td on td.domain = t.domain
   where t.domain is not null and t.domain <> '' and td.tenant_id <> t.id;

  raise notice 'tenant_domains coverage: matched=%, orphans=%, mismatches=%',
    matched, orphans, mismatches;

  if orphans > 0 or mismatches > 0 then
    raise exception
      'tenant_domains verification FAILED: % orphan + % mismatch tenants.domain row(s). See sections 2 and 3 above.',
      orphans, mismatches;
  end if;

  raise notice
    'tenant_domains verification PASSED: all % tenants.domain row(s) have a matching tenant_domains row at the same tenant_id.',
    matched;
end $$;
