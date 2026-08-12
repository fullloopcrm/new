-- Backs the payment-followup-daily cron's per-slot idempotency guard
-- (src/app/api/cron/payment-followup-daily/route.ts). The previous check
-- was a non-atomic SELECT-count-then-INSERT against sms_logs with no
-- unique constraint behind it, so two overlapping/retried cron invocations
-- (a Vercel cron double-fire, a manual ?force=1 retry racing the scheduled
-- run, etc.) could both pass the count check before either INSERT
-- committed -- double-texting the client for the same 8am/12pm/5pm slot.
--
-- slot_key is a deterministic 'YYYY-MM-DD-<localHour>' string computed in
-- route.ts from the tenant's own local calendar date + send-slot hour, so
-- "same slot" now has one canonical identity a real DB constraint can key
-- on, instead of the old "any sms_logs row within 3.5h of now" heuristic.
-- Nullable + partial unique index: only this cron's rows set slot_key, so
-- every other sms_logs writer (payment-reminder.ts, 30min-alert, etc.) is
-- unaffected.

ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS slot_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_logs_booking_type_slot_unique
  ON sms_logs(booking_id, sms_type, slot_key)
  WHERE slot_key IS NOT NULL;
