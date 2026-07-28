-- Adopted from legacy hand-run migration: 049_smart_schedule_parity.sql
-- Original commit date (git first-add): 2026-04-27T20:03:19-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Smart-schedule parity with nycmaid 2026-04-25.
-- Fullloop's smart-schedule.ts reads columns that did not exist; this migration
-- adds them so the scoring logic actually returns data instead of nothing.

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS home_latitude NUMERIC;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS home_longitude NUMERIC;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS home_by_time TIME DEFAULT '18:00';
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS service_zones TEXT[];

-- Cache geocoded client coords (used by both smart-schedule and ClientsMap).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude NUMERIC;
