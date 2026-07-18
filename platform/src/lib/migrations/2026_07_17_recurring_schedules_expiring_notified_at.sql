-- 2026_07_17_recurring_schedules_expiring_notified_at.sql
-- W1 fresh-ground finding (2026-07-17), continuation of the same
-- claim-before-send/scoping bug class as deals.follow_up_notified_at
-- (2026_07_17_deals_follow_up_notified_at.sql, same session).
--
-- cron/daily-summary's "RECURRING EXPIRATION CHECK" (30-day warning) has
-- two independent bugs in its dedup:
--
-- 1. WRONG SCOPE: the pre-send check queries `notifications` for
--    `type = 'recurring_expiring'` filtered ONLY by tenant_id and a 7-day
--    window -- not by which schedule the warning is for. Once ANY schedule
--    in a tenant gets a warning, every OTHER schedule's expiration warning
--    is silently suppressed for the next 7 days, even though they've never
--    been notified about their own expiration. With several schedules
--    expiring around the same time (a common real pattern -- clients who
--    signed up together), only one of them ever gets warned; the rest can
--    lapse with no admin notice at all. Not a race -- reproduces
--    single-threaded, every run.
--
-- 2. RACE: same shape as every other fix this session -- the check runs
--    BEFORE notify(), and the `notifications` row that's supposed to be the
--    dedup record is inserted AFTER notify() resolves, with no constraint
--    backing it. Two overlapping invocations (a retried cron delivery) can
--    both read zero "existing" warnings and both email the admin.
--
-- Fix (code, same commit): a dedicated timestamptz column on
-- `recurring_schedules`, claimed via compare-and-swap BEFORE notify() --
-- correctly scoped per-schedule (fixes bug 1) and atomic (fixes bug 2).
-- The `notifications` insert stays, for the admin-dashboard history feed
-- that already reads `type = 'recurring_expiring'` -- it just runs after
-- the claim now, as a log record rather than the (broken) dedup mechanism.
--
-- Sentinel default + `<`-based claim (not the nullable-NULL-means-pending
-- convention used by this session's one-shot booking markers): this warning
-- is intentionally resendable every 7 days for as long as a schedule stays
-- in the expiring window, so the claim needs "never notified OR notified
-- more than 7 days ago", not a one-time flag. Expressing that as a single
-- comparison (`expiring_last_notified_at < now() - 7 days`) instead of an
-- OR of two conditions needs a non-null floor value that's always more than
-- 7 days in the past -- the epoch sentinel is that floor.

alter table recurring_schedules
  add column if not exists expiring_last_notified_at timestamptz not null default '1970-01-01T00:00:00Z';

comment on column recurring_schedules.expiring_last_notified_at is
  'Last time cron/daily-summary sent the 30-day recurring-expiration warning FOR THIS SCHEDULE, claimed via compare-and-swap (WHERE expiring_last_notified_at < now() - 7 days) before notify(). Epoch sentinel (not NULL) means never notified, chosen so the claim is a single < comparison instead of an is-null-or-stale OR. Replaces the old notifications-table check, which was scoped to the whole tenant instead of the schedule and raced besides.';
