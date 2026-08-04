-- Fixes a real bug found live (2026-08-04) on the same day
-- tenant_site_content shipped: generateTenantSite()'s upsert
-- (`onConflict: 'tenant_id,page_type,slug'`) failed with "there is no unique
-- or exclusion constraint matching the ON CONFLICT specification" for every
-- area — confirmed live testing on the Template Preview tenant (5 areas, all
-- 5 writes failed, zero rows ever landed; AI generation + validation
-- themselves succeeded, only the write step broke).
--
-- Root cause: the original migration split uniqueness across TWO PARTIAL
-- indexes (slug IS NOT NULL / slug IS NULL) to handle future singleton page
-- types (slug NULL). Postgres won't match a plain `ON CONFLICT (cols)`
-- against a partial index unless the ON CONFLICT clause also repeats the
-- exact WHERE predicate — Supabase's upsert() doesn't support that.
--
-- This was unnecessary complexity: a single PLAIN (non-partial) unique index
-- on (tenant_id, page_type, slug) already does the right thing — Postgres
-- treats every NULL as distinct from every other NULL by default, so a plain
-- unique index already allows unlimited NULL-slug rows per (tenant_id,
-- page_type) without conflicting, while still correctly blocking duplicate
-- non-null (tenant_id, page_type, slug) combinations. No partial-index
-- trick needed.
--
-- Safe to apply: the table has been live for under an hour and every write
-- attempt against it so far has failed with this exact error, so there is no
-- data to preserve or migrate.
--
-- Idempotent: IF EXISTS / IF NOT EXISTS throughout. GATED — author only, do
-- not apply without Jeff's explicit go per THE PROCEDURE in
-- platform/docs/runbooks/migration-runbook.md.

-- ─── PRE (informational) ─────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE 'PRE tenant_site_content_fix: row count=%, old indexes present=%',
    (SELECT count(*) FROM tenant_site_content),
    (SELECT count(*) FROM pg_indexes WHERE tablename = 'tenant_site_content' AND indexname IN ('uq_tenant_site_content_slug', 'uq_tenant_site_content_singleton'));
END $$;

DROP INDEX IF EXISTS uq_tenant_site_content_slug;
DROP INDEX IF EXISTS uq_tenant_site_content_singleton;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_site_content_tenant_type_slug
  ON tenant_site_content(tenant_id, page_type, slug);

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'tenant_site_content' AND indexname = 'uq_tenant_site_content_slug') THEN
    RAISE EXCEPTION 'POST FAILED: old partial index uq_tenant_site_content_slug still present';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'tenant_site_content' AND indexname = 'uq_tenant_site_content_tenant_type_slug') THEN
    RAISE EXCEPTION 'POST FAILED: uq_tenant_site_content_tenant_type_slug missing';
  END IF;
  RAISE NOTICE 'tenant_site_content_fix POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   DROP INDEX IF EXISTS uq_tenant_site_content_tenant_type_slug;
--   CREATE UNIQUE INDEX uq_tenant_site_content_slug ON tenant_site_content(tenant_id, page_type, slug) WHERE slug IS NOT NULL;
--   CREATE UNIQUE INDEX uq_tenant_site_content_singleton ON tenant_site_content(tenant_id, page_type) WHERE slug IS NULL;
