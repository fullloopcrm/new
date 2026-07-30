-- Tenant projects (2026-07-30) — Phase 2 (Projects/Services build-out), Phase C
--
-- Adds tenant_projects: a portfolio/before-after table for project-led trades
-- (remodeling, roofing, painting, landscaping, etc. — see
-- PROJECT_LEAD_INDUSTRIES in src/lib/industry-presets.ts). Built for EVERY
-- tenant regardless of industry, seeded empty — a dumpster or cleaning
-- tenant gets the same structure, just never links to it in nav (that's a
-- code-side visibility flag, selena_config.show_projects, not a schema
-- concern — no column needed for it here since selena_config is already
-- jsonb).
--
-- Same shape/pattern as tenant_locations / tenant_notes
-- (20260730004424_tenant_profile_gaps.sql): tenant_id FK cascade, an
-- updated_at trigger (this table IS mutated after creation — an admin edits
-- a project's photos/description/status over time, unlike the append-only
-- tenant_notes log), RLS enabled with no policies (service-role bypass +
-- app-layer tenant scoping via getTenantForRequest, same as every other
-- tenant-scoped table in this schema).
--
-- Idempotent: every statement is IF NOT EXISTS / safe to re-run.
-- No destructive ops. GATED — author only, do not apply without Jeff's
-- explicit go per THE PROCEDURE in docs/runbooks/migration-runbook.md.

-- ─── PRE (informational — confirm nothing here already exists) ─────────
DO $$
BEGIN
  RAISE NOTICE 'PRE tenant_projects: tenant_projects exists=%',
    (SELECT to_regclass('public.tenant_projects') IS NOT NULL);
END $$;

-- ─── Projects (portfolio / before-after) ────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  before_photo_url TEXT,
  after_photo_url TEXT,
  completed_at DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_projects_tenant ON tenant_projects(tenant_id, active, sort_order);

CREATE OR REPLACE FUNCTION tenant_projects_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tenant_projects_updated_at ON tenant_projects;
CREATE TRIGGER trg_tenant_projects_updated_at BEFORE UPDATE ON tenant_projects
  FOR EACH ROW EXECUTE FUNCTION tenant_projects_updated_at();

ALTER TABLE tenant_projects ENABLE ROW LEVEL SECURITY;

-- No seed data — this table is deliberately seeded EMPTY for every tenant
-- (Jeff's instruction: build the structure, don't invent portfolio content).
-- The /projects site page and its nav link both work with zero rows; the
-- page just renders empty until an admin adds real projects.

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF to_regclass('public.tenant_projects') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: tenant_projects table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_projects' AND column_name = 'tenant_id'
  ) THEN
    RAISE EXCEPTION 'POST FAILED: tenant_projects.tenant_id missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_projects_updated_at'
  ) THEN
    RAISE EXCEPTION 'POST FAILED: trg_tenant_projects_updated_at trigger missing';
  END IF;
  RAISE NOTICE 'tenant_projects POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
-- Pointer lives here per the same convention as
-- 20260730004424_tenant_profile_gaps.sql (deploy-runbook.md's ROLLBACK
-- QUICK-REFERENCE table does not exist in this checkout):
--   DROP TRIGGER IF EXISTS trg_tenant_projects_updated_at ON tenant_projects;
--   DROP FUNCTION IF EXISTS tenant_projects_updated_at();
--   DROP TABLE IF EXISTS tenant_projects;
