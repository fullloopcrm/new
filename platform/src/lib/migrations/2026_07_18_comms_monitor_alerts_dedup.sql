-- 2026_07_18_comms_monitor_alerts_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: cron/comms-monitor (src/app/api/cron/comms-monitor/route.ts) dedups
-- by SELECTing `notifications` for an existing type='comms_monitor_alert'
-- row whose message contains the current fingerprint, THEN calls
-- alertOwner() (real Telegram DM) + INSERTs the alert row unconditionally --
-- the exact check-then-act race this session has repeatedly found and fixed
-- across cron/schedule-monitor, cron/sales-follow-ups, and every webhook
-- redelivery-dedup pass. This cron has no maxDuration override (default
-- Vercel limit) and runs every 15 min per its own header comment -- two
-- overlapping invocations (a slow DB round-trip on one run bleeding into the
-- next tick, or a manual re-trigger) can both SELECT zero prior alerts for
-- the same fingerprint and both DM the platform admin, doubling a real
-- incident alert.
--
-- Note the dedup horizon in the old code (`gte(dedupSince)`, DEDUP_HOURS=1)
-- was already effectively moot: `fingerprint` is a sorted join of the
-- specific `notifications.id`s currently inside the 20-min failure window
-- (WINDOW_MIN), and those underlying rows themselves age out of that same
-- 20-min window before an hour ever passes -- the exact same fingerprint
-- reappearing after it's no longer in `fails` is not reachable. A plain
-- permanent unique constraint on fingerprint is therefore sufficient and
-- simpler than reproducing the time-windowed check atomically.
--
-- Fix (code, same commit): insert-first claim into this new table BEFORE
-- alertOwner()/notify-insert, same idiom as telnyx_webhook_events /
-- resend_webhook_events / stripe_webhook_events -- a unique violation on
-- fingerprint means another invocation already claimed (and is alerting
-- for) this exact failure batch, so the loser skips as an idempotent no-op.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS comms_monitor_alerts (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
