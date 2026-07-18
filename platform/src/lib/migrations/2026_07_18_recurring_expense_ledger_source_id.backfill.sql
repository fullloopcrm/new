-- 2026_07_18_recurring_expense_ledger_source_id.backfill.sql
-- FILE ONLY — do NOT execute here. Leader runs after Jeff approves.
-- MUST run BEFORE 064_unique_journal_entries.sql. Reconciles pre-existing
-- data so 064's own pre-flight duplicate check does not misfire on this
-- table (see WHY below) and so recurring postings keep working once 064's
-- unique index is live.
--
-- WHY: cron/recurring-expenses/route.ts posts one journal_entries row per
-- due period, using source='recurring' and (until this fix)
-- source_id=recurring_expenses.id — the RULE row's id, which never changes
-- across periods. 064 adds a UNIQUE INDEX on (tenant_id, source, source_id)
-- WHERE source_id IS NOT NULL to stop a genuinely different bug class
-- (concurrent callers double-posting the SAME one-shot event). For every
-- other poster (booking, job_payment, payout, payroll, refund, chargeback,
-- bank_txn, ...) source_id really is a one-shot event id, so that index is
-- correct for them. But a recurring_expenses row is a RECURRENCE RULE: the
-- same id legitimately backs MANY real, distinct journal entries (one per
-- due date) over its lifetime. Two consequences if this table isn't fixed
-- before 064 applies:
--   1. 064's own pre-flight query (`GROUP BY tenant_id, source, source_id
--      HAVING COUNT(*) > 1`) will flag every recurring expense that has
--      already fired more than once as a "duplicate" needing manual
--      review/reversal — these are NOT duplicates, they're correct monthly
--      postings, and voiding them would understate real expenses.
--   2. Even if the pre-flight were skipped, CREATE UNIQUE INDEX would then
--      fail outright on any tenant with >1 existing posting for the same
--      recurring_expenses row, blocking 064 entirely.
--
-- FIX: recompute source_id for every existing 'recurring' journal_entries
-- row as a deterministic UUID v5 of (source_id, entry_date) instead of the
-- bare rule id — one distinct, stable id per period. The app-side
-- counterpart (src/lib/finance/recurring-expense-ledger.ts,
-- recurringExpenseLedgerSourceId()) computes the SAME id going forward via
-- Node's crypto, using the identical SHA-1 + version/variant-bit algorithm,
-- so historical and future rows land on the same id for the same period and
-- neither depends on the other at runtime.
--
-- Idempotent: re-running recomputes the same v5 id from the CURRENT
-- source_id, so as long as this runs exactly once, re-running is a no-op
-- (the second run's "old" source_id is already the v5 id, which does not
-- match any recurring_expenses.id, so the WHERE clause's implicit
-- old-scheme filter — see note below — naturally excludes already-migrated
-- rows). Safe to re-run.
--
-- PRE-FLIGHT (leader must run before applying): confirm every 'recurring'
-- journal_entries row's current source_id actually matches a
-- recurring_expenses.id (the old scheme) before this runs, and spot-check
-- the row counts before/after:
--   SELECT count(*) FROM journal_entries WHERE source = 'recurring';
--   SELECT count(*) FROM journal_entries je WHERE je.source = 'recurring'
--     AND EXISTS (SELECT 1 FROM recurring_expenses re WHERE re.id = je.source_id);
-- These two counts should match — if not, some 'recurring' rows already use
-- a different id scheme (e.g. a prior partial migration) and need manual
-- review before this file is applied.

do $$
declare
  _row record;
  _ns bytea;
  _hash bytea;
  _new_id uuid;
  _updated bigint := 0;
begin
  -- Fixed namespace UUID — MUST match RECURRING_EXPENSE_LEDGER_NAMESPACE in
  -- src/lib/finance/recurring-expense-ledger.ts exactly, or ids diverge.
  _ns := decode(replace('7d9f9e5a-6c1b-4a2e-9d0a-3b7e5c1f9a02', '-', ''), 'hex');

  for _row in
    select je.id, je.source_id, je.entry_date
    from journal_entries je
    where je.source = 'recurring'
      -- Only rows still on the OLD scheme (source_id = the rule's own id).
      -- Already-migrated rows (source_id = a derived v5 id) never match a
      -- recurring_expenses.id, so this naturally makes the backfill
      -- idempotent on re-run.
      and exists (select 1 from recurring_expenses re where re.id = je.source_id)
  loop
    _hash := digest(_ns || convert_to(_row.source_id::text || ':' || _row.entry_date::text, 'UTF8'), 'sha1');
    _hash := substring(_hash from 1 for 16);
    _hash := set_byte(_hash, 6, (get_byte(_hash, 6) & 15) | 80);  -- version 5
    _hash := set_byte(_hash, 8, (get_byte(_hash, 8) & 63) | 128); -- RFC 4122 variant
    _new_id := encode(_hash, 'hex')::uuid;

    update journal_entries set source_id = _new_id where id = _row.id;
    _updated := _updated + 1;
  end loop;

  raise notice 'recurring_expense_ledger_source_id backfill: % row(s) migrated to per-period source_id', _updated;
end $$;

-- ── Verification (expect zero rows) ─────────────────────────────────────
-- Any 'recurring' journal_entries row whose source_id still resolves to a
-- live recurring_expenses.id means the backfill loop above missed it.
--   SELECT je.id, je.source_id, je.entry_date
--   FROM journal_entries je
--   WHERE je.source = 'recurring'
--     AND EXISTS (SELECT 1 FROM recurring_expenses re WHERE re.id = je.source_id);
--
-- Confirms no residual (tenant_id, source, source_id) duplicates remain
-- before 064's CREATE UNIQUE INDEX runs:
--   SELECT tenant_id, source, source_id, COUNT(*)
--   FROM journal_entries
--   WHERE source = 'recurring'
--   GROUP BY tenant_id, source, source_id
--   HAVING COUNT(*) > 1;
