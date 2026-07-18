-- 2026_07_18_anthropic_health_alerts_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: cron/anthropic-health (src/app/api/cron/anthropic-health/route.ts)
-- pings the Anthropic API every 15 min (vercel.json) and DMs the owner via
-- Telegram on EVERY failing tick when the failure is a credit/auth/rate-limit
-- error -- zero dedup at all, same "no attempt whatsoever" class as
-- cron/tenant-health before its fix (2026_07_18_tenant_health_alerts_dedup.sql),
-- not even a racy check-then-act window. A real credit-exhaustion outage
-- (Yinez silent across EVERY tenant until someone tops up console.anthropic.com)
-- re-alerts the owner every 15 min for as long as it stays down -- e.g. a
-- 3-hour gap before anyone tops up credits means 12 near-identical "URGENT:
-- OUT OF CREDITS" DMs.
--
-- The failure TYPE is a stable identifier, not an ephemeral one: credit,
-- auth, and rate-limit are qualitatively different problems that legitimately
-- recur independently (credits topped up, outage over, then rate-limited
-- again during a traffic spike days later) -- same reasoning as
-- cron/health-monitor's stable cron-name-set fingerprint, so a plain
-- permanent unique constraint would silently suppress every future
-- recurrence of that failure type forever.
--
-- Fix (code, same commit): a two-step atomic claim on this new table --
-- fresh insert first (fingerprint = 'credit' | 'auth' | 'rate_limit'); on a
-- 23505 conflict, a second atomic UPDATE ... WHERE alerted_at < now()-1h
-- reclaims and re-arms a stale row, same idiom as cron/health-monitor's
-- cron_health_alerts and cron/tenant-health's tenant_health_alerts. 1h
-- re-alert window, same as tenant-health's, not health-monitor's 6h --
-- credit exhaustion silences the AI agent across every tenant, which is at
-- least as revenue/customer-impact-critical as one tenant's site being down.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS anthropic_health_alerts (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
