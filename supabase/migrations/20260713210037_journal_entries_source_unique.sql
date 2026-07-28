-- Adopted from legacy hand-run migration: 2026_07_13_journal_entries_source_unique.sql
-- Original commit date (git first-add): 2026-07-13T17:00:37-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- TOCTOU fix: every source-tagged ledger post (revenue, labor, deposits,
-- refunds, chargebacks, commissions) has always guarded against double-posting
-- with a plain `journalEntryExists()` SELECT before the INSERT (see
-- lib/ledger.ts, lib/finance/post-revenue.ts, post-adjustments.ts,
-- post-labor.ts) — a select-then-insert with a gap, backed only by the plain
-- (non-unique) idx_journal_tenant_source index. Two concurrent posts for the
-- same (tenant, source, source_id) — e.g. a Stripe webhook redelivery racing
-- the first delivery, or a cron backfill overlapping a real-time post — could
-- both pass the check and both insert a journal entry, double-counting
-- revenue/expense.
--
-- This unique index makes the INSERT inside post_journal_entry() (migration
-- 039) the atomic decision point: the loser gets a 23505 unique-violation,
-- which every caller now catches and treats as already-posted (see the
-- application-side fix in the same commit).
--
-- Partial (WHERE source_id IS NOT NULL) — manual/ad-hoc entries with no
-- source_id are exempt, same as the existing plain index's usage pattern.
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_source_unique
  ON journal_entries(tenant_id, source, source_id)
  WHERE source_id IS NOT NULL;
