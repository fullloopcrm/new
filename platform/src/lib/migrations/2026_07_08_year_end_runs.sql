-- Year-End auto-send tracking. One row per (tenant, tax year). The cron creates
-- a 'pending_review' row when the fiscal year closes, notifies the tenant, and
-- after the 48-hour review window auto-sends the package to the accountant on
-- file — unless the tenant held it. Additive, non-destructive.

CREATE TABLE IF NOT EXISTS year_end_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'held', 'sent', 'cancelled', 'failed')),
  accountant_email TEXT,
  review_deadline TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, year)
);

CREATE INDEX IF NOT EXISTS idx_year_end_runs_due ON year_end_runs(status, review_deadline);
CREATE INDEX IF NOT EXISTS idx_year_end_runs_tenant ON year_end_runs(tenant_id, year);
