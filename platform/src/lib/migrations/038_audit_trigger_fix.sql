-- Migration 038: Fix audit trigger + period-lock gaps discovered during 037 testing.
--
-- 1. audit_row_changes() raised `undefined_column` on any table without
--    `tenant_id` (e.g. tenants itself). Wrap extraction in BEGIN/EXCEPTION
--    and fall back to NEW.id when the table is `tenants` (its id IS the
--    tenant id). For any other table lacking tenant_id, emit NULL so the
--    audit log can still record the event.
-- 2. audit_log.tenant_id made nullable so rows from pre-tenant tables
--    (prospects) and edge cases don't bounce the insert.
-- 3. Re-attach trg_audit to the full set of tables we want covered.
-- 4. check_period_lock() used `entity_id = NEW.entity_id OR entity_id IS NULL`,
--    which misses entity-specific locks when NEW.entity_id itself is NULL
--    (`NULL = NULL` → NULL, not true). Switch to IS NOT DISTINCT FROM so
--    nulls compare equal to nulls.
-- 5. Period-lock trigger now fires on UPDATE of entity_id too — otherwise
--    you can sneak an entry into a locked period by flipping its entity.

-- ─── 1 + 2: audit_log nullable + patched function ─────────────────────
ALTER TABLE audit_log ALTER COLUMN tenant_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION audit_row_changes() RETURNS TRIGGER AS $$
DECLARE
  tn UUID; en UUID; rid UUID; changed TEXT[] := '{}';
  k TEXT; oldv JSONB; newv JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    BEGIN tn := (OLD).tenant_id;
    EXCEPTION WHEN undefined_column THEN
      IF TG_TABLE_NAME = 'tenants' THEN tn := (OLD).id; ELSE tn := NULL; END IF;
    END;
    BEGIN en := (OLD).entity_id; EXCEPTION WHEN undefined_column THEN en := NULL; END;
    BEGIN rid := (OLD).id; EXCEPTION WHEN undefined_column THEN rid := NULL; END;
    INSERT INTO audit_log (tenant_id, entity_id, table_name, row_id, event, old_data)
    VALUES (tn, en, TG_TABLE_NAME, rid, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;

  BEGIN tn := (NEW).tenant_id;
  EXCEPTION WHEN undefined_column THEN
    IF TG_TABLE_NAME = 'tenants' THEN tn := (NEW).id; ELSE tn := NULL; END IF;
  END;
  BEGIN en := (NEW).entity_id; EXCEPTION WHEN undefined_column THEN en := NULL; END;
  BEGIN rid := (NEW).id; EXCEPTION WHEN undefined_column THEN rid := NULL; END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tenant_id, entity_id, table_name, row_id, event, new_data)
    VALUES (tn, en, TG_TABLE_NAME, rid, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      oldv := to_jsonb(OLD) -> k;
      newv := to_jsonb(NEW) -> k;
      IF oldv IS DISTINCT FROM newv THEN
        changed := array_append(changed, k);
      END IF;
    END LOOP;
    IF array_length(changed, 1) IS NOT NULL THEN
      INSERT INTO audit_log (tenant_id, entity_id, table_name, row_id, event, changed_fields, old_data, new_data)
      VALUES (tn, en, TG_TABLE_NAME, rid, 'UPDATE', changed, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 3: re-attach trg_audit on the full table set ─────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- Original finance set
    'invoices','bank_transactions','journal_entries','journal_lines',
    'expenses','recurring_expenses','chart_of_accounts','bank_accounts',
    'entities','quotes','documents','payments',
    -- Extended coverage
    'tenants','prospects','onboarding_tasks','clients','bookings',
    'team_members','accounting_periods'
  ] LOOP
    -- Skip tables that don't exist in this environment
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON %I', t);
      EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_row_changes()', t);
    END IF;
  END LOOP;
END $$;

-- ─── 4 + 5: period lock — null-safe entity compare + fire on entity flip ──
CREATE OR REPLACE FUNCTION check_period_lock() RETURNS TRIGGER AS $$
DECLARE
  y INTEGER; m INTEGER; locked TEXT;
BEGIN
  y := EXTRACT(YEAR FROM NEW.entry_date);
  m := EXTRACT(MONTH FROM NEW.entry_date);
  SELECT status INTO locked FROM accounting_periods
    WHERE tenant_id = NEW.tenant_id
      AND (entity_id IS NOT DISTINCT FROM NEW.entity_id OR entity_id IS NULL)
      AND year = y AND month = m
      AND status = 'locked'
    LIMIT 1;
  IF locked = 'locked' THEN
    RAISE EXCEPTION 'Period %-% is locked for this entity/tenant. Reopen it first.', y, m;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_period_lock ON journal_entries;
CREATE TRIGGER trg_check_period_lock
  BEFORE INSERT OR UPDATE OF entry_date, entity_id ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION check_period_lock();
