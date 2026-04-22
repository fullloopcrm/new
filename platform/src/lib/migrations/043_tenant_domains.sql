-- 043_tenant_domains.sql
-- Multi-domain support per tenant. The middleware lookup in
-- src/lib/tenant-lookup.ts already falls back to this table, but the
-- table was never created. Without it, a tenant with more than one
-- domain (e.g. nycmaid has thenycmaid.com AND thenewyorkcitymaid.com)
-- only resolves on its primary.

create table if not exists tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  domain text not null unique,
  active boolean not null default true,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_tenant_domains_tenant
  on tenant_domains (tenant_id, active);

comment on table tenant_domains is
  'Multi-domain aliases per tenant. The canonical domain still lives on tenants.domain for back-compat; this table holds the full set including aliases.';

-- Seed nycmaid's two live domains.
insert into tenant_domains (tenant_id, domain, active, is_primary, notes)
  select id, 'thenycmaid.com', true, false, 'Secondary live domain — seed from migration 043'
    from tenants where slug = 'the-nyc-maid'
  on conflict (domain) do nothing;

insert into tenant_domains (tenant_id, domain, active, is_primary, notes)
  select id, 'thenewyorkcitymaid.com', true, true, 'Primary live domain — seed from migration 043'
    from tenants where slug = 'the-nyc-maid'
  on conflict (domain) do nothing;
