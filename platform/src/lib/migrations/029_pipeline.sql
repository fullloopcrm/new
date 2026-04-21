-- Migration 029: Sales pipeline — proper stages, follow-ups, stage-time tracking.
-- Existing deals table already has stage/value_cents/probability/expected_close_date/status
-- — this adds the missing follow-up fields + stage_changed_at + indexes for forecast queries.

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_note TEXT,
  ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS title_override BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill stage_changed_at from updated_at where null
UPDATE deals SET stage_changed_at = COALESCE(updated_at, created_at)
  WHERE stage_changed_at IS NULL;

-- Forecast-friendly indexes
CREATE INDEX IF NOT EXISTS idx_deals_tenant_close ON deals(tenant_id, expected_close_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_deals_tenant_followup ON deals(tenant_id, follow_up_at) WHERE follow_up_at IS NOT NULL AND status = 'active';

-- Stage-transition tracking: keep stage_changed_at updated automatically.
CREATE OR REPLACE FUNCTION deals_stage_change_tracker() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_deals_stage_change ON deals;
CREATE TRIGGER trg_deals_stage_change
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION deals_stage_change_tracker();

-- Normalize any legacy deals that used 'active' as stage
UPDATE deals SET stage = 'qualified' WHERE stage = 'active';
UPDATE deals SET stage = 'won' WHERE stage = 'booked';
UPDATE deals SET stage = 'lost' WHERE stage = 'removed';
