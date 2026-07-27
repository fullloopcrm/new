-- 2026_07_26_dedup_error_logs_backlog.sql
-- One-time cleanup for the error_logs backlog that predates the dedup fix in
-- src/lib/error-tracking.ts (fix(monitoring): dedup error_logs instead of
-- piling up duplicate rows). That fix stops NEW duplicates; this collapses
-- the ~2,500 that already piled up (dominated by cron/system-check's
-- "Notifications (24h)" check, which has been genuinely failing since
-- 2026-07-10 -- confirmed real on the live /admin/monitoring page, 270
-- comms failures in the last 24h alone, not a false-positive check).
--
-- WHAT THIS DOES: for every group of open (resolved=false, dismissed_at
-- IS NULL) rows sharing the same (route, message, tenant_id), keeps the
-- single newest row -- open, so the still-real problem stays visible -- sets
-- its metadata.occurrence_count to the group's true total, and dismisses
-- the rest with a clear audit trail (dismissed_by/suppress_reason). Nothing
-- is deleted. Rows already resolved or dismissed are untouched.
--
-- DOES NOT fix the underlying comms-failure problem itself -- that needs a
-- real investigation (which tenant, which channel, why) that didn't fit in
-- this session. The canonical row for cron/system-check's Notifications
-- alert stays open and visible specifically so that work doesn't get lost.
--
-- DO NOT RUN from a worktree. Leader/Jeff applies on prod directly.
-- Safe to re-run: idempotent (a second pass finds nothing left to collapse).

begin;

with groups as (
  select
    route,
    message,
    tenant_id,
    (array_agg(id order by created_at desc))[1] as keep_id,
    count(*) as total,
    max(created_at) as last_seen
  from error_logs
  where resolved = false and dismissed_at is null
  group by route, message, tenant_id
  having count(*) > 1
)
update error_logs e
set
  metadata = coalesce(e.metadata, '{}'::jsonb) || jsonb_build_object('occurrence_count', g.total, 'backlog_collapsed_at', now()),
  created_at = g.last_seen
from groups g
where e.id = g.keep_id;

with groups as (
  select
    route,
    message,
    tenant_id,
    (array_agg(id order by created_at desc))[1] as keep_id
  from error_logs
  where resolved = false and dismissed_at is null
  group by route, message, tenant_id
  having count(*) > 1
)
update error_logs e
set
  dismissed_at = now(),
  dismissed_by = 'backlog-dedup-2026-07-26',
  suppress_reason = 'Collapsed duplicate — see the newest row in this (route, message, tenant) group for the live occurrence count.',
  suppressed = true
from groups g
where e.route is not distinct from g.route
  and e.message = g.message
  and e.tenant_id is not distinct from g.tenant_id
  and e.id != g.keep_id
  and e.resolved = false
  and e.dismissed_at is null;

commit;

-- Verify after applying:
--   select route, message, tenant_id, count(*) from error_logs
--   where resolved = false and dismissed_at is null
--   group by 1,2,3 having count(*) > 1;
--   -- should return zero rows.
