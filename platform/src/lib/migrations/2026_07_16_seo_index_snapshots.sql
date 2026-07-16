-- ===========================================================================
-- 2026_07_16_seo_index_snapshots.sql
-- SIGNAL — indexation-cliff detection (SEOMGR-NEXT-SESSION.md step 3).
--
-- seo_sitemaps.contents already carries Google's own reported indexed count
-- per sitemap (Sitemaps API `contents[].indexed`), refreshed weekly by
-- runTechnicalScan — but that row is upserted in place, so there is no
-- history to compare against. This table is the missing time series: one
-- row per property per day, summed indexed/submitted counts, so a drop
-- (e.g. the 19k -> 1,005 homeservicesbusinesscrm.com collapse) shows up as
-- a delta against a trailing baseline instead of vanishing silently.
-- ===========================================================================

create table if not exists seo_index_snapshots (
  id              uuid primary key default gen_random_uuid(),
  property        text not null,
  tenant_id       uuid references tenants(id) on delete set null,
  indexed_count   integer not null default 0,
  submitted_count integer not null default 0,
  snapshot_date   date not null default current_date,
  captured_at     timestamptz not null default now()
);

-- One snapshot per property per day — safe to re-run the scan same day.
create unique index if not exists uq_seo_index_snapshots_property_date
  on seo_index_snapshots (property, snapshot_date);
create index if not exists idx_seo_index_snapshots_property_date_desc
  on seo_index_snapshots (property, snapshot_date desc);
create index if not exists idx_seo_index_snapshots_tenant
  on seo_index_snapshots (tenant_id);

alter table seo_index_snapshots enable row level security;
drop policy if exists "deny_all_seo_index_snapshots" on seo_index_snapshots;
create policy "deny_all_seo_index_snapshots" on seo_index_snapshots
  for all using (false) with check (false);

comment on table seo_index_snapshots is
  'SIGNAL: daily indexed-page-count snapshot per property (from Sitemaps API contents[].indexed), used to detect indexation cliffs over time.';
