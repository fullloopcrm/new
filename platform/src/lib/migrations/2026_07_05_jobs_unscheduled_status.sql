-- M-04: sold jobs were stamped status:'scheduled' even with no booking attached,
-- so a sold-but-undated job looked identical to a booked one on the Jobs board.
-- Add an 'unscheduled' state so createJobFromQuote can mark jobs that have no
-- session yet. Additive-only: existing rows keep their status; no data rewrite.
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('unscheduled', 'scheduled', 'in_progress', 'completed', 'cancelled'));
