/**
 * Ledger `source_id` derivation for recurring_expenses postings.
 *
 * Every other ledger poster's source_id is a row that exists once per
 * real-world event (a booking, a payout, a refund) — see ledger.ts's
 * post_journal_entry uniqueness on (tenant_id, source, source_id). But a
 * `recurring_expenses` row is the RULE, not the occurrence: the same row id
 * fires every period (monthly, quarterly, ...) for the life of the
 * recurrence. Posting with source_id = recurring_expenses.id directly would
 * make every period after the first collide with the unique index and get
 * silently dropped by post_journal_entry's ON CONFLICT DO NOTHING.
 *
 * Fix: derive a per-period id (deterministic UUID v5 of rule id + due date)
 * so each occurrence gets its own source_id — genuinely idempotent against a
 * retry of the SAME period, but distinct across periods so the recurrence
 * keeps posting every cycle.
 *
 * Mirrored in SQL by
 * migrations/2026_07_18_recurring_expense_ledger_source_id.backfill.sql,
 * which recomputes this same id for every pre-existing 'recurring'
 * journal_entries row so they don't collide once the (tenant_id, source,
 * source_id) unique index (migration 064) is applied.
 */
import { uuidV5 } from '../uuid-v5'

// Arbitrary fixed namespace UUID for this derivation. Must never change —
// changing it would silently re-derive different ids for every existing
// posting and defeat the backfill's dedup guarantee.
export const RECURRING_EXPENSE_LEDGER_NAMESPACE = '7d9f9e5a-6c1b-4a2e-9d0a-3b7e5c1f9a02'

/** due date must be the DATE column's plain 'YYYY-MM-DD' string form. */
export function recurringExpenseLedgerSourceId(recurringExpenseId: string, dueDate: string): string {
  return uuidV5(RECURRING_EXPENSE_LEDGER_NAMESPACE, `${recurringExpenseId}:${dueDate}`)
}
