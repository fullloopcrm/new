-- Widen quote_budgets to also cover recurring_schedules, not just quotes.
--
-- WHY: a budget was only reachable via a quote (quote -> job.quote_id carries
-- it forward). Recurring work SOLD through a quote already got a path via
-- 2026_07_04_quote_recurring.sql (quotes.converted_schedule_id). But a huge
-- share of recurring schedules are set up directly by an admin with no quote
-- at all (an existing client added to a weekly cleaning, no proposal ever
-- sent) -- those had zero path to a budget. Decision: let a budget attach
-- directly to a recurring_schedules row too.
--
-- Same table, not a parallel one, so the entire existing budget UI/API
-- (line items, templates, actuals-vs-budget) works unchanged for both.

-- Wrapped in a transaction: if any statement below fails (e.g. the CHECK
-- constraint validation), everything rolls back instead of leaving this live
-- table half-migrated (NOT NULL dropped + new column added, but no
-- constraint/indexes).
BEGIN;

ALTER TABLE quote_budgets ALTER COLUMN quote_id DROP NOT NULL;
ALTER TABLE quote_budgets ADD COLUMN IF NOT EXISTS recurring_schedule_id UUID
  REFERENCES recurring_schedules(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'quote_budgets' AND constraint_name = 'quote_budgets_one_parent_chk'
  ) THEN
    ALTER TABLE quote_budgets ADD CONSTRAINT quote_budgets_one_parent_chk
      CHECK ((quote_id IS NOT NULL) <> (recurring_schedule_id IS NOT NULL));
  END IF;
END $$;

-- Old unique index assumed quote_id was always set (NOT NULL); replace with
-- partial indexes so each parent type gets its own "one budget per row" rule.
DROP INDEX IF EXISTS idx_quote_budgets_quote;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_budgets_quote_id ON quote_budgets(quote_id) WHERE quote_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_budgets_recurring_schedule_id ON quote_budgets(recurring_schedule_id) WHERE recurring_schedule_id IS NOT NULL;

COMMIT;
