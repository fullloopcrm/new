-- ===========================================================================
-- 2026_07_05_seo_autopilot.sql
-- SIGNAL autopilot — track which changes the machine applied vs a human, so the
-- verify-and-revert cron only judges (and can roll back) its own auto-applied
-- changes. Human 'admin' applies are never auto-reverted.
-- ===========================================================================
alter table seo_changes add column if not exists applied_by text not null default 'admin';

-- Fast lookup for the canary rate-cap ("how many did autopilot apply to this
-- site in the last 7 days?") and the verify sweep ("applied autopilot changes
-- older than the verify window, not yet judged").
create index if not exists idx_seo_changes_autopilot
  on seo_changes (applied_by, status, applied_at);

comment on column seo_changes.applied_by is 'SIGNAL: who applied — admin | autopilot. Only autopilot changes are auto-reverted.';
