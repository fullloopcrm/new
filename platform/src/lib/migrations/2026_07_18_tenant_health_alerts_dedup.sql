-- 2026_07_18_tenant_health_alerts_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: cron/tenant-health (src/app/api/cron/tenant-health/route.ts), the
-- "Fortress" live tenant-darkening detector, called alertOwner() (Telegram)
-- on EVERY run where any tenant failed its health check -- zero dedup at
-- all, not even a racy check-then-act window like this session's other
-- monitor fixes started from. This cron runs every 15 min per vercel.json:
-- a single ongoing outage (a tenant's DNS/deploy broken for an hour)
-- re-alerted the owner every 15 min for as long as it stayed down -- same
-- "duplicate incident alert" harm class as cron/comms-monitor and
-- cron/health-monitor, just arriving from no dedup attempt at all instead
-- of an unguarded one.
--
-- The failing-tenant SET is a stable identifier, not an ephemeral one: the
-- same tenant (or set of tenants) can legitimately go down, recover, and go
-- down again days later -- same reasoning as cron/health-monitor's stable
-- cron-name-set fingerprint, so a plain permanent unique constraint would
-- silently suppress every future recurrence of that failure set forever.
--
-- Fix (code, same commit): a two-step atomic claim on this new table --
-- fresh insert first (fingerprint = sorted failing tenant slugs); on a
-- 23505 conflict, a second atomic UPDATE ... WHERE alerted_at < now()-1h
-- reclaims and re-arms a stale row, same idiom as cron/health-monitor's
-- cron_health_alerts. 1h re-alert window (shorter than health-monitor's 6h)
-- because a tenant's own site being down is revenue-critical and
-- customer-visible, not an internal cron-liveness signal -- Jeff/leader can
-- retune ALERT_WINDOW_MS in route.ts if 1h proves too chatty or too quiet.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS tenant_health_alerts (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
