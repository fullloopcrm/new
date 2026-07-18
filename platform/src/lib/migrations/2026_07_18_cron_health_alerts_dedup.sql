-- 2026_07_18_cron_health_alerts_dedup.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: cron/health-monitor's fingerprint dedup has the identical
-- check-then-act race just closed in cron/comms-monitor (see
-- 2026_07_18_comms_monitor_alerts_dedup.sql) -- SELECT `notifications` for
-- an existing cron_health_alert row matching this failing-cron-set's
-- fingerprint within the last 6h, THEN alertOwner() (real Telegram DM) +
-- INSERT unconditionally. Two overlapping invocations (a slow lastOccurrence
-- loop across 9 checks bleeding into the next tick, a manual re-trigger) can
-- both read zero recent matches and both DM the platform admin.
--
-- Unlike comms-monitor's fingerprint (built from ephemeral notification ids
-- that age out of their own lookback window, which made its old 1h horizon
-- moot), health-monitor's fingerprint is the sorted list of CURRENTLY-SILENT
-- CRON NAMES -- a stable identifier that legitimately recurs: the same set
-- of crons can go silent, recover, then go silent again days later. The
-- 6-hour re-alert window is real behavior to preserve here, not incidental
-- -- a plain permanent unique constraint (comms-monitor's fix) would wrongly
-- suppress every future occurrence of the same failing set forever.
--
-- Fix (code, same commit): insert-first claim, and on a 23505 conflict, a
-- second atomic UPDATE ... WHERE alerted_at < now()-6h reclaims and re-arms
-- a stale row -- same "fresh claim, then reclaim-if-stale" two-step CAS this
-- session already used for create-tenant-from-lead.ts's conversion claim,
-- just against a dedicated fingerprint row instead of a nullable column on
-- an existing entity.
--
-- No backfill needed -- brand-new table, nothing to dedupe retroactively.

CREATE TABLE IF NOT EXISTS cron_health_alerts (
  fingerprint text PRIMARY KEY,
  alerted_at timestamptz NOT NULL DEFAULT now()
);
