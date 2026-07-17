-- 2026_07_17_recurring_schedules_extra_team_member_ids_backfill.sql
-- Backfills recurring_schedules.extra_team_member_ids (added by
-- 2026_07_17_recurring_schedules_extra_team_member_ids.sql) for every
-- EXISTING schedule that has a real named-extras roster in its own booking
-- history. MUST run AFTER that file.
--
-- extra_team_member_ids was never persisted onto recurring_schedules -- the
-- only ground truth for "who were the extras" is the booking_team_members
-- rows POST /api/client/recurring wrote for the INITIAL batch (cron's refill
-- never wrote any, which is exactly the gap this migration pair closes going
-- forward). Recovered from the schedule's MOST RECENT booking that has any
-- non-lead booking_team_members rows -- not a union/merge across the whole
-- history, because crew composition can legitimately change over a series'
-- lifetime (an admin swaps an extra in/out) and the most recent snapshot is
-- the intended CURRENT roster, same reasoning admin recurring-schedules
-- PUT already applies when it propagates a team_member_id change forward to
-- every future booking.
--
-- Schedules with no non-lead booking_team_members rows anywhere in their
-- history are left NULL on purpose -- identical in effect to team_size<=1
-- (solo/lead-only), nothing to recover.
--
-- Idempotent: guarded by `extra_team_member_ids is null`, so re-running only
-- fills gaps and never overwrites a value a later write has since set
-- correctly (see POST /api/client/recurring and cron/generate-recurring,
-- which now carry this forward at write time going forward).

with latest_booking_with_extras as (
  select distinct on (b.schedule_id)
    b.schedule_id,
    b.id as booking_id
  from bookings b
  where b.schedule_id in (select id from recurring_schedules)
    and exists (
      select 1 from booking_team_members btm
      where btm.booking_id = b.id and btm.is_lead = false
    )
  order by b.schedule_id, b.start_time desc
),
extras_agg as (
  select
    lbe.schedule_id,
    array_agg(btm.team_member_id order by btm.position) as extra_ids
  from latest_booking_with_extras lbe
  join booking_team_members btm
    on btm.booking_id = lbe.booking_id and btm.is_lead = false
  group by lbe.schedule_id
)
update recurring_schedules rs
set extra_team_member_ids = ea.extra_ids
from extras_agg ea
where rs.id = ea.schedule_id
  and rs.extra_team_member_ids is null;

-- ── VERIFICATION (informational, not fail-loud) ─────────────────────────
-- Recovering NULL here is an expected, safe outcome for every solo/lead-only
-- schedule (the vast majority) -- this reports the count that actually had a
-- named-extras roster recovered, for spot-checking against known multi-
-- person accounts, not a failed-run signal.
do $$
declare
  n_recovered bigint;
begin
  select count(*) into n_recovered
    from recurring_schedules
    where extra_team_member_ids is not null and array_length(extra_team_member_ids, 1) > 0;

  raise notice '2026_07_17_recurring_schedules_extra_team_member_ids_backfill: % schedule(s) recovered a named-extras roster from booking history', n_recovered;
end $$;
