-- 2026_07_16_unique_payments_raw_email_id.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: email/monitor/route.ts's processTenant() idempotency check on
-- payments.raw_email_id (dedup by IMAP message id, so a re-detected Zelle/
-- Venmo confirmation email doesn't get recorded twice) is a plain
-- select-then-insert with no DB constraint behind it -- same TOCTOU class as
-- 065_unique_payments_reference.sql. Two concurrent invocations of this cron
-- endpoint for the same tenant (overlapping cron fires, or a manual re-trigger
-- racing the scheduled one -- the route has no run-lock and maxDuration is
-- 60s) can both fetchUnreadEmails() the SAME message before either call's
-- markEmailRead() lands, both pass the dup check, and both insert a payments
-- row: the booking gets double-marked paid, the client gets a duplicate
-- "payment received" SMS, and a duplicate in-app notification fires.
--
-- Partial unique index (not a full UNIQUE constraint) because most payments
-- have no raw_email_id (only the email-monitor path sets it) -- NULLs must
-- not conflict, same as 064/065/067.
--
-- route.ts is updated in the same commit to catch 23505 on this insert and
-- treat it as an idempotent no-op (skip the booking update/SMS/notification)
-- instead of proceeding -- but that catch is inert until this index actually
-- exists in prod. Migration + JS fix must land together.

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_tenant_raw_email_id_unique
  ON payments(tenant_id, raw_email_id)
  WHERE raw_email_id IS NOT NULL;
