-- 2026_07_17_recurring_schedules_custom_interval_backfill.sql
-- Backfills recurring_schedules.custom_interval_days (added by
-- 2026_07_17_recurring_schedules_custom_interval.sql) for every EXISTING
-- recurring_type = 'custom' schedule. MUST run AFTER that file.
--
-- The interval was never persisted at creation time -- it only ever lived
-- transiently in BookingsAdmin.tsx's form state (customInterval), which
-- computed the initial batch of dates client-side and POSTed the dates
-- themselves, not the interval. That value cannot be recovered from
-- recurring_schedules alone. It CAN be recovered from ground truth: the
-- actual spacing between that schedule's own already-created bookings,
-- which were created at the real customInterval*7-day cadence
-- (dashboard/bookings/_recurring.ts). Uses the MEDIAN gap (not the first
-- gap) so a single manually-rescheduled or cancelled-and-recreated visit
-- doesn't skew the recovered interval.
--
-- Schedules with fewer than 2 bookings have no measurable gap and are left
-- NULL on purpose -- lib/recurring.ts's 'custom' case treats NULL as "emit
-- only the anchor" (never guesses a cadence), so those schedules simply keep
-- today's exact behavior (no auto-refill) until an admin edits them with a
-- real interval.
--
-- Idempotent: guarded by `custom_interval_days is null`, so re-running only
-- fills gaps and never overwrites an interval a later edit has since set
-- correctly (see POST /api/admin/recurring-schedules and the regenerate
-- route, which now derive+store this at write time going forward).

with gaps as (
  select
    schedule_id,
    round(extract(epoch from (start_time - lag(start_time) over (partition by schedule_id order by start_time))) / 86400)::int as gap_days
  from bookings
  where schedule_id in (select id from recurring_schedules where recurring_type = 'custom')
),
median_gap as (
  select
    schedule_id,
    percentile_disc(0.5) within group (order by gap_days) as median_gap_days
  from gaps
  where gap_days is not null and gap_days > 0
  group by schedule_id
)
update recurring_schedules rs
set custom_interval_days = mg.median_gap_days
from median_gap mg
where rs.id = mg.schedule_id
  and rs.recurring_type = 'custom'
  and rs.custom_interval_days is null;

-- ── VERIFICATION (informational, not fail-loud) ─────────────────────────
-- Unlike the pin_hash backfill, a remaining gap here is an EXPECTED, safe
-- outcome (schedules with 0-1 bookings) rather than a bug -- so this reports
-- rather than raising. Any count > 0 is a worklist for manual admin review
-- (set an interval by hand, or leave paused/cancelled), not a failed run.
do $$
declare
  n_unresolved bigint;
begin
  select count(*) into n_unresolved
    from recurring_schedules
    where recurring_type = 'custom' and custom_interval_days is null;

  raise notice '2026_07_17_recurring_schedules_custom_interval_backfill: % custom schedule(s) still have no recoverable interval (fewer than 2 bookings) -- needs manual admin review, cron will not auto-refill them', n_unresolved;
end $$;
