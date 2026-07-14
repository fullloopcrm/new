-- 055_tenant_domains_routing.sql
-- P1 schema lane (W1). Adds routing/status columns to tenant_domains per
-- P1-SCHEMA-SPEC.md so per-tenant routing (bespoke vs template site, target
-- Vercel project, lifecycle status) can live in DATA instead of the hardcoded
-- BESPOKE_SITE_TENANTS set in src/middleware.ts.
--
-- NULLABLE-FIRST. This file ONLY adds the columns (nullable, no data-defaults
-- for the source-derived ones) and the updated_at plumbing. Existing rows are
-- left NULL so the backfill can populate them from the real source of truth.
--
-- RUN ORDER (apply in Supabase SQL editor, in this order — see admin/docs):
--   1. 055_tenant_domains_routing.sql          <-- this file (add nullable)
--   2. 055_tenant_domains_routing.backfill.sql <-- populate every existing row
--   3. 056_tenant_domains_routing_enforce.sql  <-- NOT NULL + defaults
--
-- The columns are added per P1-SCHEMA-SPEC.md as text + CHECK (NOT a native
-- enum), so W2's resolver can treat them as plain CHECK-constrained text.
-- tenants.domain is intentionally NOT dropped — it stays as the resolver
-- fallback for this phase.

-- routing_mode: which site subtree the middleware rewrites to.
--   'bespoke'  -> /site/<slug>   (own marketing subtree)
--   'template' -> /site/template (shared config-driven template)
-- Added WITHOUT a default: bespoke rows must be backfilled from the
-- BESPOKE_SITE_TENANTS list, so a blanket 'template' default here would be
-- WRONG for them. CHECK passes on NULL, so it is safe pre-backfill.
alter table tenant_domains
  add column if not exists routing_mode text;

alter table tenant_domains
  drop constraint if exists tenant_domains_routing_mode_check;
alter table tenant_domains
  add constraint tenant_domains_routing_mode_check
  check (routing_mode in ('bespoke', 'template'));

-- vercel_project: the Vercel project that serves this domain. Today every
-- tenant serves from a single project (process.env.VERCEL_PROJECT_ID, code
-- fallback 'fullloopcrm'); this column exists so bespoke sites can migrate to
-- their own Vercel projects later. No default: onboarding / backfill must set
-- it explicitly. Added nullable; enforced NOT NULL after backfill.
alter table tenant_domains
  add column if not exists vercel_project text;

-- status: domain lifecycle. Distinct from the existing `active` boolean; this
-- carries the 3-state contract from the spec. Added WITHOUT a default so the
-- backfill maps it from the existing `active` flag. CHECK passes on NULL.
alter table tenant_domains
  add column if not exists status text;

alter table tenant_domains
  drop constraint if exists tenant_domains_status_check;
alter table tenant_domains
  add constraint tenant_domains_status_check
  check (status in ('active', 'pending', 'archived'));

-- created_at already exists from migration 043 (create table). Guarded add is a
-- no-op there; included so this migration is also correct against any DB where
-- 043's create had drifted.
alter table tenant_domains
  add column if not exists created_at timestamptz not null default now();

-- updated_at is new. Unlike the source-derived columns above, a now() default
-- is a correct value for every existing row (no per-tenant source to honor), so
-- it is safe to add NOT NULL DEFAULT immediately. The backfill refines existing
-- rows to created_at for accuracy.
alter table tenant_domains
  add column if not exists updated_at timestamptz not null default now();

-- Keep updated_at current on every UPDATE (repo convention: per-table fn +
-- BEFORE UPDATE trigger, e.g. 034_entities.sql / 037_leads_qualification.sql).
create or replace function tenant_domains_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tenant_domains_updated_at on tenant_domains;
create trigger trg_tenant_domains_updated_at
  before update on tenant_domains
  for each row execute function tenant_domains_updated_at();

comment on column tenant_domains.routing_mode is
  'bespoke = /site/<slug> subtree; template = shared /site/template. Source of truth for site routing; replaces the hardcoded BESPOKE_SITE_TENANTS set in middleware.ts.';
comment on column tenant_domains.vercel_project is
  'Vercel project serving this domain. Single project today (VERCEL_PROJECT_ID, fallback fullloopcrm); per-tenant projects are a later phase.';
comment on column tenant_domains.status is
  'Domain lifecycle: active | pending | archived. Distinct from the active boolean, which stays for back-compat.';
