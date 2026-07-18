-- 2026_07_18_entity_default_must_be_active.sql
-- P1 schema lane (W1). Fresh-ground: DELETE /api/finance/entities/[id]'s
-- "block archiving the default entity" guard was a check-then-act race
-- (SELECT is_default, ... later ... UPDATE active=false) with no DB backstop
-- -- unlike entities.is_default itself (idx_entities_tenant_default, unique
-- partial index, migration 034), nothing prevented is_default=TRUE AND
-- active=FALSE from coexisting. A concurrent PATCH .../[id] {make_default:true}
-- on the SAME entity landing between the DELETE route's SELECT and its
-- UPDATE flips is_default=TRUE just before the archive fires, leaving the
-- tenant's default entity archived. Every place that resolves "the tenant's
-- default entity" when no entity_id is given -- getDefaultEntityId()
-- (src/lib/entity.ts, 4 live callers: POST /api/invoices, POST
-- /api/finance/expenses, POST /api/finance/bank-accounts, cron
-- generate-monthly-invoices) and this function's own SQL-side fallback below
-- -- selected by is_default alone, no active filter, so every NEW financial
-- write with no explicit entity_id would keep silently posting to a dead
-- entity forever (it no longer shows in listEntities()'s active-only list,
-- so nobody would even see it to notice).
--
-- Two fixes, both file-only, not applied:
--
-- 1. set_default_entity(tenant_id, entity_id) -- new atomic RPC, same
--    single-UPDATE idiom as set_primary_client_contact /
--    set_primary_client_property: `SET is_default = (id = target)` covers
--    demote-everyone-else + promote-target in ONE statement, so no window
--    exists for a concurrent call to interleave. The pre-check locks the
--    target row with `SELECT ... FOR UPDATE` before validating `active`,
--    which serializes it against DELETE's archive UPDATE on the same row
--    (whichever transaction's write on that row commits first, the other
--    correctly sees the post-commit state) -- closes the race from both
--    directions instead of just moving the check. Code fix (POST/PATCH
--    /api/finance/entities routes calling this RPC instead of their old
--    two-step demote-then-write) ships alongside this file; the DELETE
--    route's own fix (an atomic `.eq('is_default', false)` guard on the
--    archive UPDATE itself, so the is_default check happens in the same
--    statement as the write, not a preceding SELECT) needs no RPC.
--
-- 2. post_journal_entry's entity fallback gets `AND active = TRUE` added.
--    This CREATE OR REPLACE matches migration 039's CURRENT body exactly
--    (no other change) -- migration 064_unique_journal_entries.sql
--    (idempotent ON CONFLICT rewrite) is still file-only/unapplied per its
--    own header, so replacing with that shape here would reference
--    idx_journal_entries_source_unique before it exists, breaking every
--    journal post at runtime until 064 lands. 064's own draft has been
--    given the same `AND active = TRUE` addition so whichever one leader
--    applies last still has the fix.
--
-- 3. (see PRE-FLIGHT + BACKFILL at the bottom of this file) -- the same
--    active-filter gap existed on 4 more "resolve the tenant's default
--    entity" reads that this fresh-ground pass swept up as siblings once
--    found: ensureDefaultEntity() (src/lib/entity-provision.ts, the
--    explicitly-documented self-healing function for "every tenant must own
--    exactly one default entity" -- WITHOUT the active filter it reads an
--    archived default back as "already exists" and never heals),
--    getTenantProfile() (src/lib/tenant-profile.ts, read-only prefill), and
--    the admin + onboarding business-profile routes' own inline
--    is_default lookups (src/app/api/admin/businesses/[id]/profile/route.ts,
--    src/app/api/dashboard/onboarding/profile/route.ts x2). All 4 code-fixed
--    alongside this file. If this bug already fired in prod before today
--    (an entity is_default=TRUE AND active=FALSE right now), EVERY one of
--    those self-healing/create paths is still permanently stuck, because
--    idx_entities_tenant_default's unique slot is still held by the
--    archived row -- a fresh INSERT with is_default:true would 23505. The
--    backfill below clears that stale flag so the next call to any of the
--    fixed paths above can actually create/promote a new active default.
--    applies last still has the fix.

CREATE OR REPLACE FUNCTION set_default_entity(
  p_tenant_id uuid,
  p_entity_id uuid
) RETURNS void AS $$
DECLARE
  _active boolean;
BEGIN
  SELECT active INTO _active FROM entities
    WHERE id = p_entity_id AND tenant_id = p_tenant_id
    FOR UPDATE;
  IF _active IS NULL THEN
    RAISE EXCEPTION 'set_default_entity: entity % not found for tenant %', p_entity_id, p_tenant_id;
  END IF;
  IF NOT _active THEN
    RAISE EXCEPTION 'set_default_entity: entity % is archived, cannot be made default', p_entity_id;
  END IF;

  UPDATE entities
  SET is_default = (id = p_entity_id)
  WHERE tenant_id = p_tenant_id;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION set_default_entity(uuid, uuid) FROM PUBLIC, authenticated;
GRANT  EXECUTE ON FUNCTION set_default_entity(uuid, uuid) TO service_role;
ALTER  FUNCTION set_default_entity(uuid, uuid) SET search_path = public, pg_temp;

-- ── post_journal_entry: add the same active filter to its entity fallback ──
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
  -- `active` filter added 2026-07-18: an archived entity must never win
  -- this fallback even if is_default was left TRUE on it by a race.
  _entity_id := p_entity_id;
  IF _entity_id IS NULL THEN
    SELECT id INTO _entity_id
      FROM entities
      WHERE tenant_id = p_tenant_id AND is_default = TRUE AND active = TRUE
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

-- Same grants as migration 039 + 060 (060 REVOKEd `authenticated`, restated
-- here for clarity in case this file ever runs standalone before those).
GRANT EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) TO service_role;
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM authenticated, PUBLIC;

-- ── PRE-FLIGHT (leader: run this SELECT first, share the result before the
-- backfill below runs) ─────────────────────────────────────────────────
--   SELECT id, tenant_id, name, is_default, active
--   FROM entities
--   WHERE is_default = TRUE AND active = FALSE;
-- Expected today: 0 rows (this bug's live blast radius has not been
-- confirmed, only the code path that could cause it). If it returns any
-- rows, each is a tenant currently stuck exactly as described above.

-- ── BACKFILL: clear the stale flag so self-healing can recreate a real
-- default ───────────────────────────────────────────────────────────────
-- Does NOT pick a replacement default (that's a business decision -- which
-- of the tenant's other active entities, if any, should become the new
-- default -- not something to guess in a backfill). It only frees the
-- idx_entities_tenant_default unique slot so the next call to
-- ensureDefaultEntity() / any of the 3 code-fixed routes above can create or
-- promote a real active default for that tenant instead of silently no-op'ing
-- against the archived row forever.
UPDATE entities
SET is_default = FALSE
WHERE is_default = TRUE AND active = FALSE;
