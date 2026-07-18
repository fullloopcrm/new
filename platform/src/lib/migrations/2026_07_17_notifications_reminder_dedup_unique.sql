-- 2026_07_17_notifications_reminder_dedup_unique.sql
-- W1 fresh-ground finding (2026-07-17), continuation of this session's
-- claim-before-send pass (post-job-followup / late-check-in).
--
-- cron/reminders had THREE separate broken dedup mechanisms, all in the
-- same file:
--
-- 1. DAY-BASED reminders (3-day/1-day-before, tenant-configurable via
--    reminder_days): the pre-send check queried `notifications` for
--    `type = 'reminder_Nday'`, but the only write on that path goes through
--    notify(), which always inserts the fixed enum literal
--    'booking_reminder' -- never the dynamic 'reminder_Nday' value. The
--    check and the write never matched, so this dedup was DEAD CODE that
--    always saw zero existing rows -- not merely a race window like the
--    other two, but a claim that never functioned even in a single-threaded
--    run. Any double-invocation of this cron during the 8am ET hour
--    (Vercel cron retries/duplicate triggers, a risk already observed this
--    session, plus this loop's own heavy per-tenant NYC Maid geocoding work
--    against a 300s maxDuration) duplicate-sent the reminder email+SMS to
--    every matching client and the "tomorrow's schedule" SMS to every
--    assigned team member.
--
-- 2. HOUR-BASED reminders (2-hour-before, tenant-configurable via
--    reminder_hours_before): check and write both used the same
--    'reminder_Nhour' type (this one DID function as a dedup), but the
--    insert happened AFTER firing both the client and team-member SMS --
--    the same sent-before-claim race already fixed elsewhere this session.
--
-- 3. PAYMENT_DUE alert (15 min before a booking ends): same
--    sent-before-claim race -- the in-app 'payment_due' row (the actual
--    dedup record) was inserted after the admin email went out.
--
-- Fix (code, same commit): all three now insert their dedup-claim row
-- FIRST and only send if that insert succeeds. This partial unique index
-- is the atomic claim backing all three.
--
-- Partial (not a plain unique(tenant_id, booking_id, type)): notifications
-- is a general-purpose table used by many features for many types (e.g.
-- team_confirm_request intentionally gets multiple rows per booking, one
-- per hourly resend). Only these three dedup families need an
-- at-most-one-per-booking-per-type guarantee. The `day`/`hour` LIKE
-- patterns cover the tenant-configurable day/hour offsets
-- (reminder_1day, reminder_3day, reminder_5day, reminder_2hour, ...)
-- without enumerating every possible config value, and don't overlap each
-- other (distinct 'day'/'hour' suffixes).
--
-- DEDUPE-FIRST, same discipline as every other constraint added this
-- session: a partial unique index added directly against live data that
-- may already violate it (the race being real and already exploitable)
-- would just fail to apply. Step 1 keeps exactly one row per
-- (tenant_id, booking_id, type) (oldest created_at, then lowest id for a
-- deterministic tie-break) and deletes the rest. Step 2 adds the index.

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY tenant_id, booking_id, type
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM notifications
  WHERE booking_id IS NOT NULL
    AND (type LIKE 'reminder_%day' OR type LIKE 'reminder_%hour' OR type = 'payment_due')
)
DELETE FROM notifications n
USING ranked
WHERE n.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_reminder_dedup_once
  ON notifications (tenant_id, booking_id, type)
  WHERE booking_id IS NOT NULL
    AND (type LIKE 'reminder_%day' OR type LIKE 'reminder_%hour' OR type = 'payment_due');
