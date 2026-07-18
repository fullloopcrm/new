-- 2026_07_17_bookings_last_payment_followup_sent_at.sql
-- W1 fresh-ground finding (2026-07-17), same session/bug class as
-- confirmation-reminder's confirmation_reminder_sent_at fix
-- (2026_07_17_bookings_confirmation_reminder_sent_at.sql).
--
-- cron/payment-followup-daily's per-slot idempotency check queried
-- sms_logs (SELECT count WHERE sms_type='payment_followup_daily' AND
-- created_at >= idempotencyCutoff), but that row was only inserted AFTER
-- sendSMS() resolved. Same sent-before-claim race already fixed elsewhere
-- this session: two overlapping invocations in the same send slot (a
-- Vercel cron retry/duplicate trigger, an already-observed risk class)
-- could both read zero matching sms_logs rows before either write landed,
-- and both text the client asking for money.
--
-- Fix (code, same commit): a dedicated timestamptz column as the sole
-- source of truth for the claim, updated via compare-and-swap (`WHERE
-- last_payment_followup_sent_at < idempotencyCutoff`) BEFORE sending, so
-- an overlapping invocation's claim affects 0 rows and it skips. The old
-- sms_logs insert is kept as an audit trail only.
--
-- Unlike confirmation_reminder_sent_at (a one-shot claim, NULL forever
-- after), this booking gets chased repeatedly across multiple slots/days
-- until paid, so NULL can't mean "eligible" -- a plain `.lt(cutoff)` on a
-- NULL column would never match (NULL comparisons are NULL, not true, in
-- Postgres) and the booking would never claim on its first attempt. NOT
-- NULL DEFAULT epoch sidesteps that: `.lt(idempotencyCutoff)` alone (no
-- separate IS NULL branch) is true both for a booking's very first attempt
-- and for one whose last send has aged out of the current slot.

alter table bookings
  add column if not exists last_payment_followup_sent_at timestamptz not null default '1970-01-01T00:00:00+00';

comment on column bookings.last_payment_followup_sent_at is
  'Last time cron/payment-followup-daily texted this booking''s client. Claimed via compare-and-swap (WHERE last_payment_followup_sent_at < idempotencyCutoff) before sending, not after -- replaces the old sms_logs count-check as the dedup source of truth (sms_logs is still written, but as an audit trail only). Defaults to the epoch, never NULL, so the same `.lt()` comparison covers a booking''s first attempt.';
