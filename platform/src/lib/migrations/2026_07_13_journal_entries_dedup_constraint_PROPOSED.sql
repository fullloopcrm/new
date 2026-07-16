-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a real double-post race in the core accounting ledger.
--
-- Every ledger poster (post-revenue.ts, post-labor.ts, post-adjustments.ts)
-- guards against re-posting the same business event with a plain
-- `journalEntryExists(tenantId, source, sourceId)` SELECT performed in
-- application code BEFORE calling the post_journal_entry() RPC (migration
-- 039). That SELECT-then-INSERT is not atomic: two concurrent callers for the
-- same (tenant_id, source, source_id) -- a retried Stripe webhook delivery,
-- or an admin double-clicking "confirm payment" -- can both pass the SELECT
-- before either INSERT commits, posting the SAME business event to the
-- ledger twice (double revenue, double payout COGS, double deposit/refund/
-- chargeback/commission). There is currently no DB-level constraint backing
-- the dedup key at all, so both concurrent inserts simply succeed.
--
-- Fix: a partial unique index makes the DB the real source of truth for "has
-- this event already been posted", and post_journal_entry() is updated to
-- treat a conflict as a no-op (RETURNS NULL) instead of inserting a
-- duplicate. Partial (WHERE source_id IS NOT NULL) so manual/adjustment
-- entries with no natural source_id are never deduped against each other.
--
-- ledger.ts's postJournalEntry() and its 7 callers were updated in the same
-- commit to treat a NULL return as "already posted" (the same outcome their
-- existing journalEntryExists() pre-check already produces on the common
-- path) instead of the previous "no entry id returned" throw.
--
-- entry_date is part of the key, not just (tenant_id, source, source_id):
-- cron/recurring-expenses.ts reuses the SAME source_id (the recurring_expenses
-- row's own id) forever, once per firing at a NEW entry_date each time --
-- that source_id never changes across occurrences by design. A
-- source_id-only key would make every firing after the very first return
-- NULL ("already posted") against month 1's entry, and recurring-expenses.ts
-- doesn't check postJournalEntry's return value before advancing
-- next_due_date/last_fired_at -- so the cron would report "fired" and roll
-- the due date forward every month while silently posting nothing to the
-- ledger from month 2 onward. Including entry_date in the key fixes that
-- while still catching the real double-post races this migration targets:
-- post-labor.ts/post-adjustments.ts compute entry_date as "today" at call
-- time, and post-revenue.ts derives it deterministically from the booking's
-- own payment_date/start_time -- a genuine concurrent double-post for the
-- same event lands on the same entry_date in every realistic case (the
-- one-off theoretical exception is two racing calls straddling a UTC
-- midnight boundary for a same-day-computed source, which is an acceptable
-- trade against a certain, permanent silent-non-posting bug otherwise).

CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_entries_source
  ON journal_entries (tenant_id, source, source_id, entry_date)
  WHERE source_id IS NOT NULL;

CREATE OR REPLACE FUNCTION post_journal_entry(
  p_tenant_id UUID,
  p_entity_id UUID,
  p_entry_date DATE,
  p_memo TEXT,
  p_source TEXT,
  p_source_id UUID,
  p_created_by UUID,
  p_lines JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _entry_id UUID;
  _entity_id UUID;
  _line JSONB;
  _position INTEGER := 0;
  _debit_total BIGINT := 0;
  _credit_total BIGINT := 0;
BEGIN
  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'post_journal_entry: empty lines';
  END IF;

  FOR _line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    _debit_total  := _debit_total  + COALESCE((_line->>'debit_cents')::BIGINT, 0);
    _credit_total := _credit_total + COALESCE((_line->>'credit_cents')::BIGINT, 0);
  END LOOP;
  IF _debit_total <> _credit_total THEN
    RAISE EXCEPTION 'post_journal_entry: unbalanced (debits %, credits %)', _debit_total, _credit_total;
  END IF;
  IF _debit_total = 0 THEN
    RAISE EXCEPTION 'post_journal_entry: zero-amount entry';
  END IF;

  -- Resolve entity — fall back to tenant's default entity if not given.
  _entity_id := p_entity_id;
  IF _entity_id IS NULL THEN
    SELECT id INTO _entity_id
      FROM entities
      WHERE tenant_id = p_tenant_id AND is_default = TRUE
      LIMIT 1;
  END IF;

  -- Atomic dedup claim against the partial unique index above. A losing
  -- concurrent caller for the same (tenant_id, source, source_id, entry_date)
  -- gets no row back here and must return NULL instead of inserting
  -- duplicate lines.
  INSERT INTO journal_entries (tenant_id, entity_id, entry_date, memo, source, source_id, created_by)
  VALUES (p_tenant_id, _entity_id, p_entry_date, p_memo, COALESCE(p_source, 'manual'), p_source_id, p_created_by)
  ON CONFLICT (tenant_id, source, source_id, entry_date) WHERE source_id IS NOT NULL DO NOTHING
  RETURNING id INTO _entry_id;

  IF _entry_id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR _line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO journal_lines (
      tenant_id, entity_id, entry_id, coa_id, debit_cents, credit_cents, memo, position
    ) VALUES (
      p_tenant_id,
      _entity_id,
      _entry_id,
      (_line->>'coa_id')::UUID,
      COALESCE((_line->>'debit_cents')::BIGINT, 0),
      COALESCE((_line->>'credit_cents')::BIGINT, 0),
      _line->>'memo',
      _position
    );
    _position := _position + 1;
  END LOOP;

  RETURN _entry_id;
END;
$$;

-- NOTE (regression guard): migration 039 originally granted EXECUTE to
-- `authenticated`; 060_lockdown_secdef_rpcs.sql REVOKEd it because the function
-- takes p_tenant_id as a plain argument with no caller-authorization check,
-- so any authenticated end user could forge balanced journal entries into a
-- DIFFERENT tenant's books by calling the RPC directly (RLS never runs under
-- SECURITY DEFINER). This CREATE OR REPLACE must not silently reopen that
-- hole by re-granting `authenticated` — grant EXECUTE to service_role only.
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) TO service_role;
ALTER  FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) SET search_path = public, pg_temp;
