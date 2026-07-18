-- 2026_07_17_bookings_confirmations_claim_columns.sql
-- W1 fresh-ground finding (2026-07-17), same sent-before-claim bug class
-- closed elsewhere this session (confirmation-reminder/payment-followup-daily/
-- post-job-followup/late-check-in/reminders) -- this time in cron/confirmations,
-- which was twice explicitly flagged-not-fixed in this session's prior rounds
-- ("cron/confirmations has the same ordering ... lower severity, left for
-- next round") without distinguishing its two branches, which differ in
-- severity and require different claim shapes.
--
-- BRANCH 1 -- team member confirm-request (resent hourly until confirmed):
-- dedup was a SELECT of the most recent `notifications` row of type
-- 'team_confirm_request', ordered by created_at, checked against a 55-min
-- throttle -- but that row is only inserted AFTER sendSMS() resolves. Two
-- overlapping invocations (this cron loops every active tenant with no
-- run-lock, same shape as every other cron fixed this session) could both
-- read the same stale "last sent" timestamp before either write landed and
-- both text the team member. Intentionally repeating (not one-shot: a
-- resend every hour until confirmed is correct behavior), so this can't use
-- a plain unique-per-booking-per-type index like the one-shot dedup types in
-- 2026_07_17_notifications_reminder_dedup_unique.sql -- it needs the same
-- repeating-claim-column shape as last_payment_followup_sent_at.
--
-- BRANCH 2 -- client day-before confirmation (fires once per booking, gated
-- to the 1pm ET hour): dedup was a SELECT for an existing
-- 'client_confirm_request' notifications row, again inserted AFTER
-- sendSMS() -- same sent-before-claim race, but ONE-SHOT (no legitimate
-- resend), so this needs a one-shot claim column instead, same shape as
-- confirmation_reminder_sent_at. This branch is the more severe of the two:
-- unlike branch 1's 55-min throttle (which narrows but does not close the
-- window), a lost race here duplicate-texts every tomorrow-scheduled client
-- across the whole tenant base the instant the 1pm ET gate opens -- the
-- highest-fan-out moment of this cron.
--
-- BRANCH 3 -- admin "3rd+ attempt, still unconfirmed" alert (nested inside
-- branch 1): same check-then-insert shape, but for an in-app-only admin
-- notification, not a customer-facing SMS -- discovered as a direct
-- continuation of branch 1's fix, same file, same investigation. SELECTed
-- for an existing 'team_no_confirm_alert' row within a rolling 24h window
-- and only inserted if none was found, with no atomic claim between the
-- check and the insert. Two overlapping invocations landing on the same
-- booking's 3rd+ attempt could both pass the check and both insert,
-- double-alerting the admin. Lower severity than branches 1/2 (no
-- customer-facing duplicate send), but same bug class, same fix shape:
-- team_no_confirm_alert_sent_at is a repeating claim column (NOT NULL
-- DEFAULT epoch, same reasoning as team_confirm_request_sent_at -- this
-- alert can legitimately fire again after the 24h window ages out, so NULL
-- can't mean "eligible").
--
-- Fix (code, same commit): all three now claim via a compare-and-swap
-- UPDATE on bookings BEFORE sending/inserting, not after. The `notifications`
-- inserts for branches 1/2 are kept as an audit trail / attempt-counter only
-- (branch 1's own attempt-count still reads them); branch 3's insert remains
-- the actual admin-visible artifact, now gated on the claim succeeding.
--
-- team_confirm_request_sent_at: NOT NULL DEFAULT epoch, same reasoning as
-- last_payment_followup_sent_at -- this booking is claimed repeatedly across
-- many hourly attempts until confirmed, so NULL can't mean "eligible" (NULL
-- comparisons are NULL, not true, in Postgres; a plain `.lt(cutoff)` on a
-- NULL column would never match and the booking would never claim on its
-- first attempt). The epoch default makes `.lt(throttleCutoff)` alone true
-- for both a booking's very first attempt and one whose last send has aged
-- out of the 55-min throttle window.
--
-- client_confirm_request_sent_at: nullable, no default -- one-shot claim via
-- `.is(null)`, same shape as confirmation_reminder_sent_at /
-- review_followup_sent_at. NULL is the permanent, valid "not yet sent"
-- state for the lifetime of this column.
--
-- No backfill: same precedent as confirmation_reminder_sent_at and
-- last_payment_followup_sent_at (neither backfilled from prior sms_logs/
-- notifications history either) -- these are new columns, not a uniqueness
-- constraint against data that may already violate it, so there's nothing
-- to dedupe first. Known, accepted one-time side effect on deploy: every
-- currently-unconfirmed/tomorrow-scheduled booking starts as "never sent"
-- under the new columns regardless of any confirm-request notifications
-- already sent under the old mechanism, so the first cron run after this
-- migration lands may send one extra confirm-request per affected booking.
-- Bounded and non-repeating, same class of effect the payment-followup-daily
-- column introduced without issue.

alter table bookings
  add column if not exists team_confirm_request_sent_at timestamptz not null default '1970-01-01T00:00:00+00';

alter table bookings
  add column if not exists client_confirm_request_sent_at timestamptz;

alter table bookings
  add column if not exists team_no_confirm_alert_sent_at timestamptz not null default '1970-01-01T00:00:00+00';

comment on column bookings.team_confirm_request_sent_at is
  'Last time cron/confirmations texted the assigned team member a job-confirmation request. Claimed via compare-and-swap (WHERE team_confirm_request_sent_at < throttleCutoff) before sending, not after -- replaces the old notifications-table last-sent SELECT as the dedup source of truth. Defaults to the epoch, never NULL, so the same `.lt()` comparison covers a booking''s first attempt. Resets are not needed: once team_members(...).notifications has a team_confirmed row for the booking, this branch stops running for it entirely.';

comment on column bookings.client_confirm_request_sent_at is
  'Set once cron/confirmations sends the day-before client confirmation SMS. Claimed via compare-and-swap (WHERE client_confirm_request_sent_at IS NULL) before sending, not after -- replaces the old notifications-table client_confirm_request SELECT, which raced against its own write the same way confirmation_reminder_sent_at''s predecessor did.';

comment on column bookings.team_no_confirm_alert_sent_at is
  'Last time cron/confirmations alerted the admin that a team member has not confirmed after 3+ attempts. Claimed via compare-and-swap (WHERE team_no_confirm_alert_sent_at < 24h-ago) before inserting the in-app admin alert, not after -- replaces the old notifications-table rolling-24h SELECT, which had no atomic claim between the check and the insert. Defaults to the epoch, never NULL, so the same `.lt()` comparison covers a booking''s first qualifying attempt.';
