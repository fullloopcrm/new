-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- accounting_periods (035_close_audit.sql) is a compliance control: locking
-- a period blocks all journal_entries in that month for the tenant
-- (trg_check_period_lock). But 035's audit trigger rollout list
-- (invoices, bank_transactions, journal_entries, journal_lines, expenses,
-- recurring_expenses, chart_of_accounts, bank_accounts, entities, quotes,
-- documents, payments) never included accounting_periods itself — so
-- locking/reopening a period, the action that gates an entire month's
-- postings, produces zero audit_log rows.
--
-- The table also has dedicated locked_by/reopened_by UUID columns for this,
-- but PATCH /api/finance/periods/[id] never populated them correctly: the
-- live route trusted a caller-supplied body.actor_id (a finance.expenses
-- holder could forge any UUID into locked_by/reopened_by — no FK constraint
-- validates it), and the close-page UI never even sent actor_id in the
-- first place, so in real use those columns stayed permanently NULL. Same
-- root cause as hr_documents_reviewed_by_name / hr_notes.author_id: the
-- caller's real userId can be 'admin' (PIN admin) or a Clerk id, neither of
-- which fits a UUID column, so no server-trusted value could ever have been
-- written there correctly anyway.
--
-- Fix: stop trusting body.actor_id (route fixed same commit as this file)
-- and instead attach the existing, already-correct generic audit trigger —
-- it resolves the real actor via the AsyncLocalStorage-backed audit-context
-- (pin_admin / tenant_member_pin / clerk_user / clerk_super_admin, whichever
-- actually authenticated the request) the same way journal_entries and
-- payments already do. No new columns, no spoofable client input.
--
-- locked_by/reopened_by columns are left in place (harmless, always NULL
-- going forward) rather than dropped — out of scope for a bug-hunt pass to
-- unilaterally drop compliance-table columns.

DROP TRIGGER IF EXISTS trg_audit ON accounting_periods;
CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON accounting_periods
  FOR EACH ROW EXECUTE FUNCTION audit_row_changes();
