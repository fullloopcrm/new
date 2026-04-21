-- Migration 035: Monthly close + period lock + searchable audit log.
-- Period lock blocks journal_entries with entry_date inside a locked period.
-- Audit log is a DB-level trigger-based log so every tracked table gets
-- coverage without hand-editing every API route.

-- ─── accounting_periods ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,  -- null = spans all entities
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_review','locked','reopened')),
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { bank_recon: true, review_ar: true, ... }
  notes TEXT,
  locked_at TIMESTAMPTZ,
  locked_by UUID,
  reopened_at TIMESTAMPTZ,
  reopened_by UUID,
  reopened_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_periods_tenant_entity_year_month
  ON accounting_periods(tenant_id, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), year, month);
CREATE INDEX IF NOT EXISTS idx_periods_tenant_status ON accounting_periods(tenant_id, status);

CREATE OR REPLACE FUNCTION periods_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_periods_updated_at ON accounting_periods;
CREATE TRIGGER trg_periods_updated_at BEFORE UPDATE ON accounting_periods
  FOR EACH ROW EXECUTE FUNCTION periods_updated_at();

-- ─── Period lock: reject journal_entries inside a locked period ─────
CREATE OR REPLACE FUNCTION check_period_lock() RETURNS TRIGGER AS $$
DECLARE
  y INTEGER; m INTEGER; locked TEXT;
BEGIN
  y := EXTRACT(YEAR FROM NEW.entry_date);
  m := EXTRACT(MONTH FROM NEW.entry_date);
  SELECT status INTO locked FROM accounting_periods
    WHERE tenant_id = NEW.tenant_id
      AND (entity_id = NEW.entity_id OR entity_id IS NULL)
      AND year = y AND month = m
      AND status = 'locked'
    LIMIT 1;
  IF locked = 'locked' THEN
    RAISE EXCEPTION 'Period %-%  is locked for this entity/tenant. Reopen it first.', y, m;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_period_lock ON journal_entries;
CREATE TRIGGER trg_check_period_lock
  BEFORE INSERT OR UPDATE OF entry_date ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION check_period_lock();

-- ─── audit_log ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  entity_id UUID,
  table_name TEXT NOT NULL,
  row_id UUID,
  event TEXT NOT NULL CHECK (event IN ('INSERT','UPDATE','DELETE')),
  changed_fields TEXT[],
  old_data JSONB,
  new_data JSONB,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_table ON audit_log(tenant_id, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_row ON audit_log(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_id) WHERE entity_id IS NOT NULL;

-- Generic trigger — attach to any table that has tenant_id column.
CREATE OR REPLACE FUNCTION audit_row_changes() RETURNS TRIGGER AS $$
DECLARE
  tn UUID; en UUID; rid UUID; changed TEXT[] := '{}';
  k TEXT; oldv JSONB; newv JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    tn := (OLD).tenant_id;
    BEGIN en := (OLD).entity_id; EXCEPTION WHEN undefined_column THEN en := NULL; END;
    rid := (OLD).id;
    INSERT INTO audit_log (tenant_id, entity_id, table_name, row_id, event, old_data)
    VALUES (tn, en, TG_TABLE_NAME, rid, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;

  tn := (NEW).tenant_id;
  BEGIN en := (NEW).entity_id; EXCEPTION WHEN undefined_column THEN en := NULL; END;
  rid := (NEW).id;

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

-- Attach audit trigger to the critical tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'invoices','bank_transactions','journal_entries','journal_lines',
    'expenses','recurring_expenses','chart_of_accounts','bank_accounts',
    'entities','quotes','documents','payments'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_row_changes()', t);
  END LOOP;
END $$;
