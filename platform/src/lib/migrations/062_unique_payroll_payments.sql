-- Migration 062: close the payroll double-submit race (W2, 2026-07-14).
--
-- POST /api/finance/payroll always INSERTs a new payroll_payments row --
-- unlike the ledger helpers (journalEntryExists) there was no dedup key at
-- all, and unlike bank-txn match there is no existing row to atomically
-- claim (each submission creates a brand-new row). A double-click / retried
-- request for the same team member + pay period creates TWO payroll_payments
-- rows, each with its own id, so postPayrollToLedger's (source='payroll',
-- source_id=payrollPaymentId) dedup never fires -- two distinct ids, two
-- distinct journal entries, the worker gets paid and booked twice.
--
-- The route (route.ts) now checks for an existing row on
-- (tenant_id, team_member_id, period_start, period_end) before inserting,
-- which closes the SEQUENTIAL double-submit (the common case: a slow
-- double-click). This index closes the remaining CONCURRENT window the same
-- way migration 061 closed it for journal_entries: two simultaneous requests
-- can both pass the app-level existence check before either insert lands;
-- the loser's insert then fails at the DB with a unique violation (23505),
-- which the route catches and treats as idempotent (returns the winner's row).
--
-- PARTIAL index scoped to rows with both period bounds set -- ad-hoc payroll
-- entries with a null period (rare; no period selected) are not deduped and
-- remain freely insertable, matching the source_id-only scoping in 061.
--
-- DO NOT RUN until existing duplicates are reconciled. If the race already
-- double-posted, creating this index will FAIL while the dup rows exist.
-- Find them first:
--
--   SELECT tenant_id, team_member_id, period_start, period_end, count(*)
--   FROM payroll_payments
--   WHERE period_start IS NOT NULL AND period_end IS NOT NULL
--   GROUP BY tenant_id, team_member_id, period_start, period_end
--   HAVING count(*) > 1;
--
-- For each group, keep the earliest payment and void/delete the later
-- duplicate(s) (and any journal entries posted from them) before applying.

CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_payments_tenant_member_period
  ON payroll_payments (tenant_id, team_member_id, period_start, period_end)
  WHERE period_start IS NOT NULL AND period_end IS NOT NULL;
