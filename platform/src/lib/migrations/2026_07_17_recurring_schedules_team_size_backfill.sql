-- 2026_07_17_recurring_schedules_team_size_backfill.sql
-- Backfills recurring_schedules.team_size (added by
-- 2026_07_17_recurring_schedules_team_size.sql) for every EXISTING schedule
-- whose series ever ran a crew larger than 1. MUST run AFTER that file.
--
-- team_size was never persisted onto recurring_schedules -- it only ever
-- lived on the INITIAL batch of bookings POST /api/client/recurring created
-- directly. That value cannot be recovered from recurring_schedules alone.
-- It CAN be recovered from ground truth: the MAX team_size ever recorded on
-- that schedule's own bookings. Every occurrence past the initial batch was
-- silently generated with the default (1 = solo), so MAX correctly recovers
-- the intended larger crew size rather than the degraded solo value that
-- would dominate a simple average or "most recent" pick.
--
-- Schedules whose bookings never exceeded team_size 1 (or have none at all)
-- are left NULL on purpose -- every read site's Math.max(1, team_size || 1)
-- already treats NULL identically to 1, so there is nothing to recover.
--
-- Idempotent: guarded by `team_size is null`, so re-running only fills gaps
-- and never overwrites a value a later write has since set correctly (see
-- POST /api/client/recurring, cron/generate-recurring, and the admin
-- regenerate route, which now carry this forward at write time going
-- forward).

with max_team_size as (
  select schedule_id, max(team_size) as max_team_size
  from bookings
  where schedule_id in (select id from recurring_schedules)
    and team_size is not null
  group by schedule_id
  having max(team_size) > 1
)
update recurring_schedules rs
set team_size = mts.max_team_size
from max_team_size mts
where rs.id = mts.schedule_id
  and rs.team_size is null;

-- ── VERIFICATION (informational, not fail-loud) ─────────────────────────
-- Recovering NULL here is an expected, safe outcome for every solo-crew
-- schedule (the vast majority) -- this reports the count that actually had
-- a multi-person crew recovered, for spot-checking against known commercial/
-- large-property accounts, not a failed-run signal.
do $$
declare
  n_recovered bigint;
begin
  select count(*) into n_recovered
    from recurring_schedules
    where team_size is not null and team_size > 1;

  raise notice '2026_07_17_recurring_schedules_team_size_backfill: % schedule(s) recovered a team_size > 1 from booking history', n_recovered;
end $$;
