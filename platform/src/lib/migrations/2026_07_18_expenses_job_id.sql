-- POST /api/finance/expenses now accepts an optional job_id so a manual
-- expense entry (not just a job-scoped upload path) can be tied to a job for
-- that job's Costs & Receipts cost tracking.
--
-- IF NOT EXISTS: another lane may add this same column independently before
-- this reaches prod -- keep it a no-op if so, not a failed migration.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_job_id ON expenses(job_id) WHERE job_id IS NOT NULL;
