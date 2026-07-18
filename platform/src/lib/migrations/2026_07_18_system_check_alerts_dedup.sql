-- 2026_07_18_system_check_alerts_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: cron/system-check (src/app/api/cron/system-check/route.ts) runs
-- hourly (vercel.json) and calls alertOwner() (real Telegram DM) on EVERY
-- run where any of its 10 checks fail -- zero dedup at all, the identical
-- "no attempt whatsoever" class already closed for cron/tenant-health
-- (2026_07_18_tenant_health_alerts_dedup.sql). A single persistent condition
-- (e.g. CRON_SECRET or a Clerk key silently unset in an env change, DB
-- connectivity degraded) re-alerts the owner every single hour for as long
-- as it stays broken -- a day-long outage is 24 near-identical "System Check
-- FAILED" DMs. Note this route ALSO calls trackError(..., {severity:'high'})
-- immediately before its own alertOwner() call; trackError has its own
-- internal 10-minute in-memory cooldown gating a SECOND, differently-worded
-- Telegram alert -- that cooldown lives in a module-level Map
-- (src/lib/error-tracking.ts), which is not durable across separate
-- serverless invocations/cold starts, so it cannot be relied on to suppress
-- anything either. That in-memory-cooldown gap is a separate, broader issue
-- affecting every trackError(severity:high|critical) call site across the
-- app, not unique to this cron -- flagged, not fixed here (out of scope for
-- a single-route dedup pass; needs its own DB-backed pass across all
-- trackError callers).
--
-- The failing-CHECK-name SET is a stable identifier, not an ephemeral one:
-- the same check (or set of checks) can legitimately fail, recover, and fail
-- again days later -- same reasoning as cron/health-monitor's stable
-- cron-name-set fingerprint, so a plain permanent unique constraint would
-- silently suppress every future recurrence of that failure set forever.
--
-- Fix (code, same commit): a two-step atomic claim on this new table --
-- fresh insert first (fingerprint = sorted failing check names); on a 23505
-- conflict, a second atomic UPDATE ... WHERE alerted_at < now()-6h reclaims
-- and re-arms a stale row, same idiom as cron/health-monitor's
-- cron_health_alerts. 6h re-alert window, same as health-monitor's --
-- system-check's 10 dimensions are mostly internal platform-ops signals
-- (DB connectivity, env vars, notification delivery rate, error rate), the
-- same category as health-monitor's cron-liveness signal, not a single
-- tenant's customer-facing outage (tenant-health's 1h).
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS system_check_alerts (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
