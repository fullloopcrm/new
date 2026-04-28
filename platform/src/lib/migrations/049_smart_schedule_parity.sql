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
