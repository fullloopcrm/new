-- Adopted from legacy hand-run migration: 20260722145537_management_applications_resume_optional.sql
-- Original commit date (git first-add): 2026-07-22T10:59:26-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
ALTER TABLE management_applications ALTER COLUMN resume_url DROP NOT NULL;
