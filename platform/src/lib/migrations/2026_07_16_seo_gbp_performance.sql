-- ===========================================================================
-- 2026_07_16_seo_gbp_performance.sql
-- SIGNAL — Google Business Profile performance metrics (Phase 2 of
-- platform/GBP-MONITORING-BUILD-PLAN-2026-07-16.md).
--
-- One row per (tenant, day). Upserted, not blind-appended: Google's own data
-- for the last few days can still be revised, so re-fetching a trailing
-- window and upserting corrects late-arriving counts instead of leaving
-- stale rows next to corrected ones.
--
-- FILE ONLY — not applied. Per standing instruction, prod DDL runs only
-- after the leader/Jeff approve it.
-- ===========================================================================

create table if not exists seo_gbp_performance (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  location_name         text not null,          -- 'locations/{id}', matches tenants.google_business.location_name
  metric_date           date not null,
  views_search_desktop  integer not null default 0,
  views_search_mobile   integer not null default 0,
  views_maps_desktop    integer not null default 0,
  views_maps_mobile     integer not null default 0,
  calls                 integer not null default 0,
  direction_requests    integer not null default 0,
  website_clicks        integer not null default 0,
  checked_at            timestamptz not null default now()
);
create unique index if not exists uq_seo_gbp_performance_tenant_date
  on seo_gbp_performance (tenant_id, metric_date);
create index if not exists idx_seo_gbp_performance_tenant on seo_gbp_performance (tenant_id);

-- RLS — deny-all (service role bypasses). Matches 2026_07_04_seo_signal.sql.
alter table seo_gbp_performance enable row level security;
drop policy if exists "deny_all_seo_gbp_performance" on seo_gbp_performance;
create policy "deny_all_seo_gbp_performance" on seo_gbp_performance for all using (false) with check (false);

comment on table seo_gbp_performance is 'SIGNAL: daily Business Profile Performance metrics (views/calls/direction requests/website clicks) per tenant, upserted per trailing-window run.';
