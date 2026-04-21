-- Migration 039: Atomic journal posting + entity_id on bookings + RLS tightening.
--
-- 1. post_journal_entry RPC — single-transaction insert of entry + lines so a
--    failed lines-insert never leaves an orphan entry row visible.
-- 2. bookings.entity_id — needed for per-entity P&L / tax reports; backfilled
--    to the tenant's default entity like migration 034 did for finance tables.
-- 3. RLS enabled on prospects + onboarding_tasks. Both tables are written by
--    supabaseAdmin (service role bypasses RLS) so this is defense-in-depth
--    against any future authenticated-client query path.

-- ─── 1: atomic journal entry + lines ──────────────────────────────────
-- Takes lines as a JSONB array of {coa_id, debit_cents, credit_cents, memo}.
-- The DEFERRED balance trigger will fire at COMMIT and throw if unbalanced.
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
  RETURNING id INTO _entry_id;

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

GRANT EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) TO authenticated, service_role;

-- CPA token usage increment — avoids read-then-write races across concurrent downloads.
CREATE OR REPLACE FUNCTION cpa_token_bump_usage(p_token TEXT) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE cpa_access_tokens
  SET last_used_at = NOW(),
      use_count = COALESCE(use_count, 0) + 1
  WHERE token = p_token;
$$;

GRANT EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT) TO authenticated, service_role;

-- ─── 2: bookings.entity_id ────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;
UPDATE bookings
  SET entity_id = (SELECT id FROM entities WHERE tenant_id = bookings.tenant_id AND is_default LIMIT 1)
  WHERE entity_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_entity ON bookings(entity_id) WHERE entity_id IS NOT NULL;

-- ─── 3: RLS on prospects + onboarding_tasks ───────────────────────────
-- service_role (supabaseAdmin) bypasses RLS. This is for any future
-- authenticated-client path that may query these tables.
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Deny-by-default. Super-admin access goes through service_role; no policy needed.
-- Tenants can read their own onboarding tasks if authenticated with matching tenant_id.
DROP POLICY IF EXISTS onboarding_tasks_tenant_read ON onboarding_tasks;
CREATE POLICY onboarding_tasks_tenant_read ON onboarding_tasks
  FOR SELECT
  USING (
    tenant_id::text = COALESCE(current_setting('request.jwt.claims', TRUE)::jsonb->>'tenant_id', '')
  );
