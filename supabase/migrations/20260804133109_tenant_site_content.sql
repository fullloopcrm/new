-- AI-drafted, per-tenant site content store (Phase 4 of the automated
-- onboarding pipeline, ~/.claude/plans/compiled-mixing-bumblebee.md).
--
-- generateTenantSite() (src/lib/generate-tenant-site.ts) generates content
-- ONCE per page slot (at Completion, or on-demand via "Update Website") and
-- writes it here; Phase 3's dynamic pages (areas/[location],
-- careers/[location], and the existing [slug]/[slug]/[service] routes once
-- migrated) READ from this table at request time. They never call the AI
-- model themselves — that is what makes "thousands of pages, rendered on
-- demand" viable: the expensive part happens once, not on every visitor.
--
-- Same validate-then-apply contract as draftTailoredServices /
-- generateSiteBrandCopy: only ever written by generateTenantSite() after
-- shape + quality-gate validation passes. A row existing here is a promise
-- the content already passed those gates — readers do not re-validate.
--
-- Idempotent: every statement is IF NOT EXISTS / safe to re-run. No
-- destructive ops. GATED — author only, do not apply without Jeff's
-- explicit go per THE PROCEDURE in platform/docs/runbooks/migration-runbook.md.

-- ─── PRE (informational — confirm nothing here already exists) ─────────
DO $$
BEGIN
  RAISE NOTICE 'PRE tenant_site_content: table exists=%',
    (SELECT to_regclass('public.tenant_site_content') IS NOT NULL);
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenant_site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- 'hero'/'about' are singleton page types (slug NULL). 'location'/
  -- 'location_service'/'job' are one row per resolveCoverage() area (and, for
  -- location_service, per area x service_types row) — slug is the page's own
  -- URL slug (matches CoveredArea.urlSlug for location/job; `${area}-${service}`
  -- for location_service).
  page_type TEXT NOT NULL CHECK (page_type IN ('hero', 'about', 'faq', 'location', 'location_service', 'job')),
  slug TEXT,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per (tenant, page_type, slug) — slug NULL for singletons, so this
-- needs a partial unique index for the NULL-slug case (standard NULLs-aren't-
-- equal Postgres unique-constraint gap) alongside the normal case.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_site_content_slug
  ON tenant_site_content(tenant_id, page_type, slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_site_content_singleton
  ON tenant_site_content(tenant_id, page_type) WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_site_content_tenant ON tenant_site_content(tenant_id);

CREATE OR REPLACE FUNCTION tenant_site_content_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_tenant_site_content_updated_at ON tenant_site_content;
CREATE TRIGGER trg_tenant_site_content_updated_at BEFORE UPDATE ON tenant_site_content
  FOR EACH ROW EXECUTE FUNCTION tenant_site_content_updated_at();

-- RLS enabled, no policies — matches geo_nearby_places_cache/tenant_locations:
-- default-deny for anon/authenticated, reachable only via supabaseAdmin
-- (service_role, bypasses RLS). Phase 3's pages read via the server, never
-- from the browser directly.
ALTER TABLE tenant_site_content ENABLE ROW LEVEL SECURITY;

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF to_regclass('public.tenant_site_content') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: tenant_site_content table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tenant_site_content' AND indexname = 'uq_tenant_site_content_slug'
  ) THEN
    RAISE EXCEPTION 'POST FAILED: uq_tenant_site_content_slug missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tenant_site_content' AND indexname = 'uq_tenant_site_content_singleton'
  ) THEN
    RAISE EXCEPTION 'POST FAILED: uq_tenant_site_content_singleton missing';
  END IF;
  RAISE NOTICE 'tenant_site_content POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   DROP TABLE IF EXISTS tenant_site_content;
