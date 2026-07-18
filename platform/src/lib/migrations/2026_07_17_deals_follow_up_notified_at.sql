-- 2026_07_17_deals_follow_up_notified_at.sql
-- W1 fresh-ground finding (2026-07-17), new surface (not a continuation of
-- the bookings-marker family closed earlier this session).
--
-- cron/sales-follow-ups dedups by querying `notifications` for an existing
-- `type = 'follow_up'` row (matched by `metadata.deal_id`) created within
-- the last hour, THEN loops the matching deals and calls notify()/SMS
-- unconditionally -- a classic check-then-act race, same bug class as this
-- session's other claim-before-send fixes: two overlapping invocations
-- (a retried cron delivery, a manual re-trigger) can both read zero
-- "existing" notifications for the same deal and both email/text the admin.
--
-- Fix (code, same commit): a dedicated timestamptz column on `deals`,
-- claimed via compare-and-swap BEFORE notify(), same discipline as every
-- other claim-before-send fix this session.
--
-- Sentinel default, NOT the usual nullable-NULL-means-pending convention
-- used by this session's other *_sent_at columns: unlike a booking event
-- (happens once, ever), a deal's follow_up_at is a live, admin-editable due
-- date (PATCH /api/deals/[id], PUT /api/deals both accept it) -- rescheduling
-- must re-arm the reminder. The claim compares this column against the
-- CURRENT follow_up_at value with `<>` (see route.ts), and PostgREST/Postgres
-- `<>` silently excludes NULL rows from a WHERE match (`NULL <> x` is
-- unknown, not true) -- a nullable column would make the very first claim
-- attempt on a fresh deal un-matchable. A fixed epoch sentinel is a real,
-- non-null value that can never equal a genuine `follow_up_at` (all of which
-- postdate 2026), so it always compares `<>` correctly while still reading
-- as "never notified" to any caller.
--
-- Both deals PATCH routes reset this column back to the epoch sentinel
-- whenever follow_up_at is written (same commit), so a reschedule always
-- re-arms the reminder for the new due date.

alter table deals
  add column if not exists follow_up_notified_at timestamptz not null default '1970-01-01T00:00:00Z';

comment on column deals.follow_up_notified_at is
  'Set to the deals.follow_up_at value cron/sales-follow-ups last notified the admin for, claimed via compare-and-swap (WHERE follow_up_notified_at <> follow_up_at) before notify() -- replaces the old notifications-table time-window check, which both raced and was never scoped to a specific follow_up_at. Epoch sentinel (not NULL) means never notified for the current due date; PATCH /api/deals/[id] and PUT /api/deals reset it to the sentinel whenever follow_up_at changes, re-arming the reminder on reschedule.';
