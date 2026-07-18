-- Master Budget — a real per-quote budget the tenant sets at proposal time
-- and compares against actual costs once work starts.
--
-- WHY a separate table instead of columns on `quotes`: budgets are optional
-- and only some tenants use them; keeping them off the hot `quotes` row
-- avoids widening every quote read/write for a feature most rows won't use.
--
-- WHY per-QUOTE, not per-JOB: `jobs.quote_id` already links a converted job
-- back to its source quote (see 2026_07_02_jobs_projects.sql), so a single
-- quote_budgets row set at proposal time carries forward automatically once
-- the quote converts to a job — no duplicate row, no copy step.
--
-- ACTUALS ARE MANUAL, NOT AUTOMATED: there is no time-tracking (clock in/out,
-- timesheets) or job-scoped expense table in this codebase today — expenses
-- and payroll_payments are tenant-wide with no job_id/quote_id FK. So
-- labor_actual_cents / materials_actual_cents / other_actual_cents are
-- entered by hand on the Master Budget page as work progresses. Wiring these
-- to an automatic rollup is future work once job-scoped time/expense
-- tracking exists — flagged, not built here (out of scope for this task).

CREATE TABLE IF NOT EXISTS quote_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  -- Budget, set at proposal time (cents).
  labor_budget_cents INTEGER NOT NULL DEFAULT 0,
  materials_budget_cents INTEGER NOT NULL DEFAULT 0,
  other_budget_cents INTEGER NOT NULL DEFAULT 0,

  -- Target margin the tenant wants to hit, in basis points (3500 = 35%).
  -- Nullable — not every tenant sets a target.
  target_margin_bps INTEGER,

  -- Actuals, updated manually as work happens (see note above).
  labor_actual_cents INTEGER NOT NULL DEFAULT 0,
  materials_actual_cents INTEGER NOT NULL DEFAULT 0,
  other_actual_cents INTEGER NOT NULL DEFAULT 0,

  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One budget per quote.
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_budgets_quote ON quote_budgets(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_budgets_tenant ON quote_budgets(tenant_id, updated_at DESC);

CREATE OR REPLACE FUNCTION quote_budgets_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_quote_budgets_updated_at ON quote_budgets;
CREATE TRIGGER trg_quote_budgets_updated_at
  BEFORE UPDATE ON quote_budgets
  FOR EACH ROW EXECUTE FUNCTION quote_budgets_set_updated_at();
