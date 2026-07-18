-- 2026_07_18_error_alert_cooldowns_durable.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: src/lib/error-tracking.ts's trackError() gates its Telegram alert for
-- severity:'high'|'critical' with a cooldown that lived in a module-level
-- `alertCooldowns` Map -- flagged as a side-finding in
-- 2026_07_18_system_check_alerts_dedup.sql/anthropic_health_alerts_dedup.sql
-- but left out of scope for that pass. That Map is NOT durable across
-- separate serverless invocations/cold starts on Vercel: each cold start (or
-- recycled instance) starts with an empty Map, so in production it cannot
-- reliably suppress anything -- it only happened to work within a single warm
-- Lambda instance during local/test runs. This affects every one of the ~10
-- call sites across the app that pass severity:'high'|'critical' (cron/
-- system-check, cron/comms-monitor, cron/health-check, cron/health-monitor,
-- cron/late-check-in, cron/schedule-monitor, api/contact, api/portal/collect,
-- api/ingest/lead, api/lead), not just the two crons that first surfaced it.
--
-- The (source, first-50-chars-of-message) pair is a stable identifier, not an
-- ephemeral one -- the same error legitimately recurs after being fixed then
-- regressing, or recurs across unrelated incidents days apart -- so a plain
-- permanent unique constraint would silently suppress every future
-- recurrence forever. Same reasoning as this session's other alert-dedup
-- tables (cron_health_alerts, system_check_alerts, tenant_health_alerts).
--
-- Fix (code, same commit): a two-step atomic claim on this new table --
-- fresh insert first (fingerprint = `${source}:${message.slice(0,50)}`); on a
-- 23505 conflict, a second atomic UPDATE ... WHERE alerted_at < now()-10m
-- reclaims and re-arms a stale row, same idiom as cron/health-monitor's
-- cron_health_alerts. 10-minute re-alert window, unchanged from the prior
-- in-memory COOLDOWN_MS -- this migration preserves existing alert cadence,
-- it only makes the suppression actually durable.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS error_alert_cooldowns (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
