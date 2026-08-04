-- Immutable, append-only backup of what a tenant submitted through the
-- onboarding wizard. Final submit writes answers straight into the live,
-- mutable `tenants` columns (applyProfileWrite) — this table exists so a
-- later edit, re-run, or automation can never silently erase what the
-- client actually typed. One row per completed submission; never updated.

INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-snapshots', 'onboarding-snapshots', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_onboarding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Exact tenant-visible answers as submitted (PROFILE_FIELD key -> value),
  -- untouched by any later profile edit.
  data JSONB NOT NULL,
  -- Rendered read-only PDF of `data`, in the private 'onboarding-snapshots'
  -- bucket at "<tenant_id>/<id>.pdf". Nullable: the DB row (the real backup)
  -- is written first and never depends on PDF rendering succeeding.
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_onboarding_submissions_tenant
  ON tenant_onboarding_submissions(tenant_id, submitted_at DESC);

-- No policies defined (deny-all by default) — matches every other recent
-- tenant-scoped table (e.g. tenant_projects). Only supabaseAdmin (service
-- role, bypasses RLS) ever touches this table.
ALTER TABLE tenant_onboarding_submissions ENABLE ROW LEVEL SECURITY;
