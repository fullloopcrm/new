-- Adopted from legacy hand-run migration: 2026_07_22_management_applications_resume_optional.sql
-- Original commit date (git first-add): 2026-07-22T10:59:26-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- 2026_07_22_management_applications_resume_optional.sql
-- The operations-coordinator apply flow (nycmaid + wash-and-fold-hoboken +
-- wash-and-fold-nyc + the generic site/apply version) never collects a resume
-- — photo + selfie video is the actual vetting mechanism for this role — but
-- resume_url was NOT NULL, so every submission has always failed with a
-- constraint violation. Making it nullable to match the real product design.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_22_management_applications_resume_optional.sql

BEGIN;

ALTER TABLE management_applications ALTER COLUMN resume_url DROP NOT NULL;

COMMIT;
