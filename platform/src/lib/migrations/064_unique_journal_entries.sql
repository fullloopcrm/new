-- 064_unique_journal_entries.sql
-- FILE ONLY — do NOT execute here. Leader runs after Jeff approves.
--
-- NOTE ON CROSS-BRANCH NAMING: other worker branches (p1-w2, and ad-hoc dated
-- files on p1-w3/p1-w4) independently authored the SAME fix under different
-- filenames (`061_unique_journal_entries.sql` on p1-w2,
-- `2026_07_13_journal_entries_source_unique.sql` / `..._dedup_constraint_PROPOSED.sql`
-- elsewhere). This is the p1-w1 copy of that fix, numbered 064 to stay clear of
-- 061-063 already used in THIS branch. At merge time the leader only needs to
-- apply ONE of these (they converge on the same index + RPC change) — reconcile
-- like the 061/063 collision already handled, do not apply more than once.
--
-- WHY: journal_entries has only a non-unique index on (tenant_id, source,
-- source_id) (migration 032). Every ledger poster (post-revenue.ts,
-- post-labor.ts, post-adjustments.ts, plus 3 route handlers) guards re-posting
-- with a plain SELECT (journalEntryExists) in application code, then calls the
-- post_journal_entry() RPC (migration 039) to INSERT. That is check-then-act:
-- two concurrent callers for the same (tenant_id, source, source_id) — e.g. a
-- retried webhook racing the first delivery, or a cron backfill overlapping a
-- real-time post — can both pass the SELECT and both INSERT, double-posting a
-- real accounting entry (double revenue, double refund, double payroll,
-- double commission). No DB-level constraint currently prevents this.
--
-- PRE-FLIGHT (leader must run before applying, and resolve any hits before the
-- unique index can be created — a duplicate on disk will make CREATE UNIQUE
-- INDEX fail):
--   SELECT tenant_id, source, source_id, COUNT(*)
--   FROM journal_entries
--   WHERE source_id IS NOT NULL
--   GROUP BY tenant_id, source, source_id
--   HAVING COUNT(*) > 1;
-- If this returns rows, each group needs manual review (keep the earliest
-- entry, reverse/void the rest) before this migration can be applied.

-- ── 1: the DB-level guard ──────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_source_unique
  ON journal_entries (tenant_id, source, source_id)
  WHERE source_id IS NOT NULL;

-- ── 2: make the RPC idempotent instead of throwing/duplicating ────────
-- Same signature as migration 039's post_journal_entry — CREATE OR REPLACE
-- keeps every existing caller working. On a conflict (duplicate post), the
-- entry insert is skipped and the function returns NULL instead of a new
-- UUID; lines are only inserted when an entry was actually created.
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

  INSERT INTO journal_entries (tenant_id, entity_id, entry_date, memo, source, source_id, created_by)
  VALUES (p_tenant_id, _entity_id, p_entry_date, p_memo, COALESCE(p_source, 'manual'), p_source_id, p_created_by)
  ON CONFLICT (tenant_id, source, source_id) WHERE source_id IS NOT NULL DO NOTHING
  RETURNING id INTO _entry_id;

  -- Conflict hit: an entry for this (tenant_id, source, source_id) already
  -- exists. Idempotent no-op — return NULL, do not insert lines.
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
-- SECURITY DEFINER). Grant EXECUTE to service_role only here — do NOT re-add
-- `authenticated`, or this CREATE OR REPLACE silently reopens that hole.
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) TO service_role;
ALTER  FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) SET search_path = public, pg_temp;
