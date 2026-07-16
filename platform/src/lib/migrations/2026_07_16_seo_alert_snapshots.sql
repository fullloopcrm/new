-- seo_alert_snapshots — dedup state for checkCriticalSeoAlerts()
-- (src/lib/seo/alerts.ts). Tracks the fingerprint set (type:property)
-- alerted on the last run so a critical seo_issue that stays open doesn't
-- re-page Jeff every cron tick; only freshly-appeared fingerprints trigger
-- a new Jefe/Telegram alert. Mirrors jefe_snapshots' dedup shape, scoped to
-- seo_issues instead of platform health.
--
-- FILE-ONLY — not applied. Leader/Jeff runs this against prod when the
-- seo-alerts cron ships (see SEOMGR-NEXT-SESSION.md step 1/4).
create table if not exists seo_alert_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  active_fingerprints jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists idx_seo_alert_snapshots_created on seo_alert_snapshots (created_at desc);

alter table seo_alert_snapshots enable row level security;
drop policy if exists "deny_all_seo_alert_snapshots" on seo_alert_snapshots;
create policy "deny_all_seo_alert_snapshots" on seo_alert_snapshots for all using (false) with check (false);

comment on table seo_alert_snapshots is 'SIGNAL: dedup state for Jefe/Telegram critical seo_issues alerting (site_down, index_cliff).';
