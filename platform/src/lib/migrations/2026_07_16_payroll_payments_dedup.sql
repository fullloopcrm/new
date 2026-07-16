-- 2026_07_16_payroll_payments_dedup.sql
-- POST /api/finance/payroll (manual payroll-payment recording -- the
-- Finance > Payroll "Record Payment" flow) had ZERO duplicate-submission
-- protection, same class as team_member_payouts before
-- 2026_07_16_team_member_payouts_dedup.sql. A double-clicked "Record
-- Payment" button, a retried request, or two staff independently recording
-- the same payroll run each insert their own payroll_payments row.
--
-- Worse than the team_member_payouts case: postPayrollToLedger()
-- (src/lib/finance/post-labor.ts) is idempotent PER ROW (by
-- payroll_payments.id as the journal source_id), not across duplicate rows
-- -- each duplicate row is a distinct id, so each one posts its OWN balanced
-- journal entry. A double-submit doesn't just inflate a reporting sum, it
-- double-posts real labor expense to the general ledger (5000/5010 Labor),
-- corrupting P&L and cash flow, not just a report that reads the raw table.
--
-- Nullable dedup key, same two-layer shape as
-- 2026_07_16_team_member_payouts_dedup.sql / 065_unique_payments_reference.sql:
-- historical rows are unaffected (all NULL); the route populates this going
-- forward with a deterministic, time-bucketed key so a genuine retry within
-- the bucket collides at the DB level instead of silently duplicating.
--
-- Partial unique index (not a full UNIQUE constraint) so NULLs never
-- conflict with each other.

ALTER TABLE payroll_payments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_payments_tenant_idempotency
  ON payroll_payments (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
