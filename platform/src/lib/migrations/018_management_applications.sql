-- 018_management_applications.sql
-- Hiring flow for management/virtual-ops roles (tenant-scoped). Public POST from
-- the tenant's career page submits into management_applications. Draft tables
-- hold in-progress form data keyed by IP so applicants can refresh without losing work.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/018_management_applications.sql

BEGIN;

CREATE TABLE IF NOT EXISTS management_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  position text NOT NULL DEFAULT 'operations-coordinator',
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  location text NOT NULL,
  "current_role" text,
  years_experience text,
  bilingual text,
  management_experience text,
  why_this_role text,
  availability_start text,
  referral_source text,
  notes text,
  "references" jsonb,
  resume_url text NOT NULL,
  photo_url text NOT NULL,
  video_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mgmt_apps_tenant_status ON management_applications(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mgmt_apps_email ON management_applications(tenant_id, email, status);

CREATE TABLE IF NOT EXISTS management_application_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  position text NOT NULL DEFAULT 'operations-coordinator',
  form_data jsonb,
  photo_url text,
  video_url text,
  resume_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mgmt_app_draft_dedup UNIQUE (tenant_id, ip_address, position)
);

COMMIT;
