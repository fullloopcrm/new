-- Adopted from legacy hand-run migration: 2026_07_22_team_member_max_travel_minutes.sql
-- Original commit date (git first-add): 2026-07-22T18:28:23-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 2026_07_22_team_member_max_travel_minutes.sql
-- Team member profile rebuild (post-nycmaid-cutover gap): the smart scheduler
-- and admin profile need a max-travel cap alongside the existing address,
-- has_car, labor_only, service_zones, schedule, working_days, home_by_time
-- columns (already present -- see 011/013/020/049_*.sql). Ported 1:1 from the
-- nycmaid standalone build's cleaners.max_travel_minutes.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_22_team_member_max_travel_minutes.sql
-- NOT YET APPLIED TO PROD.

BEGIN;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS max_travel_minutes integer;

COMMIT;
