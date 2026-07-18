-- 2026_07_18_payroll_payments_status_backfill.sql
-- FILE ONLY -- do NOT execute here. Leader runs after Jeff approves.
--
-- WHY: POST /api/finance/payroll ("Record Payment" -- an admin recording a
-- payroll payment they already sent via Zelle/cash/etc outside the app)
-- inserted every payroll_payments row WITHOUT ever setting status or
-- paid_at, so both silently stayed at their schema defaults --
-- status='pending', paid_at=null (008_missing_tables_and_columns.sql) --
-- forever, on every row this route has ever created. This despite the same
-- request immediately calling postPayrollToLedger() to post the amount to
-- the ledger as an already-paid expense -- the row's own state never
-- reflected what the app itself already treated as true.
--
-- This is fixed going forward in the same commit as this file
-- (src/app/api/finance/payroll/route.ts now sets status:'paid',
-- paid_at:<now> on insert; src/lib/finance/post-labor.ts's
-- postPayrollToLedger/backfillUnpostedLabor now gate on status='paid',
-- matching every sibling money-posting rail in that module). This script
-- reconciles PRE-EXISTING rows to match: every payroll_payments row ever
-- created by that route represents a real, already-completed payment (the
-- route has no "schedule/draft payroll" concept), so every row with
-- status='pending' is backfilled to 'paid', with paid_at set to created_at
-- (the only timestamp on record for when the admin recorded -- i.e. sent --
-- the payment).
--
-- Idempotent: guarded by status = 'pending' (or null); re-running after the
-- first successful run matches zero rows.

update payroll_payments
set status = 'paid',
    paid_at = coalesce(paid_at, created_at)
where status is distinct from 'paid';

-- ── VERIFICATION (fail-loud) ────────────────────────────────────────────
-- Every payroll_payments row must be status='paid' with a non-null paid_at
-- after this backfill -- there is no legitimate 'pending'/draft row in the
-- current app (no code path creates one), so zero should remain.
do $$
declare
  n_gap bigint;
begin
  select count(*) into n_gap
    from payroll_payments
    where status is distinct from 'paid' or paid_at is null;

  if n_gap > 0 then
    raise exception
      '2026_07_18_payroll_payments_status_backfill: % payroll_payments row(s) still not status=paid/paid_at-set after backfill',
      n_gap;
  end if;

  raise notice '2026_07_18_payroll_payments_status_backfill: OK';
end $$;
