-- Migration 061: close the ledger idempotency TOCTOU (W2, 2026-07-11).
--
-- Every money-touching ledger helper (post-revenue, post-labor, post-adjustments)
-- dedupes with a check-then-insert: journalEntryExists(tenant, source, source_id)
-- THEN post_journal_entry(). journal_entries carries only a NON-unique index
-- (idx_journal_tenant_source, migration 032), so two CONCURRENT duplicate webhook
-- deliveries can both pass the existence check before either inserts, producing
-- TWO journal entries for one economic event → double revenue / double refund /
-- double chargeback in the books.
--
-- Sequential Stripe retries are already safe (the first post lands before the
-- second checks). This index closes the concurrent window by making the second
-- insert fail at the DB. ledger.ts postJournalEntry() catches that unique
-- violation (SQLSTATE 23505) and treats it as idempotent success, returning the
-- winner's entry id — so the guard is the index, not a prior read.
--
-- PARTIAL index scoped to rows that carry a source_id: every idempotent money
-- path (payment/booking/refund/chargeback/deposit/payout/payroll/commission…)
-- sets source_id, while ad-hoc 'manual'/'system' entries leave it NULL and must
-- remain freely insertable. Postgres treats NULLs as distinct anyway, but the
-- WHERE clause makes the intent explicit and mirrors uq_payouts_tenant_booking.
--
-- ⚠️ DO NOT RUN until existing duplicates are reconciled. If the concurrent race
-- already double-posted, creating this index will FAIL while the dup rows exist.
-- Find them first:
--
--   SELECT tenant_id, source, source_id, count(*)
--   FROM journal_entries
--   WHERE source_id IS NOT NULL
--   GROUP BY tenant_id, source, source_id
--   HAVING count(*) > 1;
--
-- For each group, keep the earliest entry and delete/void the later duplicate(s)
-- (journal_lines cascade on entry delete) before applying this migration.

CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_tenant_source
  ON journal_entries (tenant_id, source, source_id)
  WHERE source_id IS NOT NULL;
