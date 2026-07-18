-- Job-scoped expenses/receipts: crew attaches a receipt (photo + amount +
-- vendor) to the specific job it was bought for, feeding that job's cost
-- tracking (contracted vs collected vs actual cost) on /dashboard/jobs/[id].
--
-- Reuses the existing `expenses` table (030_finance.sql adds
-- category/amount/description/receipt_url/date; 033_receipts.sql adds
-- receipt_path/receipt_extracted/matched_bank_transaction_id) instead of a
-- new table -- an expense IS an expense whether or not it's tied to a job,
-- same downstream bank-reconciliation/ledger-posting path applies either way.
-- This migration only adds the FK that scopes a subset of them to a job.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_job ON expenses(job_id) WHERE job_id IS NOT NULL;
