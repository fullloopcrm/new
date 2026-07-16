-- ===========================================================================
-- 2026_07_16_seo_gbp_profile.sql
-- SIGNAL — Google Business Profile drift monitoring (Phase 1 of
-- platform/GBP-MONITORING-BUILD-PLAN-2026-07-16.md).
--
-- One row per tenant (upsert on tenant_id), holding the latest Business
-- Information snapshot. We care about drift, not history, so this is a
-- state table like seo_properties — not an append-only time series like
-- seo_vitals/seo_metrics.
--
-- FILE ONLY — not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it.
-- ===========================================================================

create table if not exists seo_gbp_profile (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null unique references tenants(id) on delete cascade,
  location_name  text not null,          -- 'locations/{id}', matches tenants.google_business.location_name
  title          text,
  phone_numbers  jsonb not null default '{}'::jsonb,
  address        jsonb not null default '{}'::jsonb,
  regular_hours  jsonb not null default '{}'::jsonb,
  special_hours  jsonb not null default '{}'::jsonb,
  categories     jsonb not null default '{}'::jsonb,
  raw            jsonb not null default '{}'::jsonb,   -- full API response, for fields not broken out above
  checked_at     timestamptz not null default now()
);
create index if not exists idx_seo_gbp_profile_tenant on seo_gbp_profile (tenant_id);

-- RLS — deny-all (service role bypasses). Matches 2026_07_04_seo_signal.sql.
alter table seo_gbp_profile enable row level security;
drop policy if exists "deny_all_seo_gbp_profile" on seo_gbp_profile;
create policy "deny_all_seo_gbp_profile" on seo_gbp_profile for all using (false) with check (false);

comment on table seo_gbp_profile is 'SIGNAL: latest Business Information snapshot per tenant, diffed each run to detect NAP/hours/category drift on the Google listing.';
