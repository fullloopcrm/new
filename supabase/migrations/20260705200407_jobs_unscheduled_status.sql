-- Adopted from legacy hand-run migration: 2026_07_05_jobs_unscheduled_status.sql
-- Original commit date (git first-add): 2026-07-05T16:04:07-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- M-04: sold jobs were stamped status:'scheduled' even with no booking attached,
-- so a sold-but-undated job looked identical to a booked one on the Jobs board.
-- Add an 'unscheduled' state so createJobFromQuote can mark jobs that have no
-- session yet. Additive-only: existing rows keep their status; no data rewrite.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('unscheduled', 'scheduled', 'in_progress', 'completed', 'cancelled'));
