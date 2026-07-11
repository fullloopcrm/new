-- 055_tenant_domains_routing.backfill.sql
-- P1 schema lane (W1). Backfills the nullable columns added by
-- 055_tenant_domains_routing.sql for EVERY existing tenant_domains row, from
-- the current source of truth (tenants.slug + the BESPOKE_SITE_TENANTS set in
-- src/middleware.ts). MUST run AFTER 055 and BEFORE 056 (the NOT NULL step).
--
-- Idempotent: every UPDATE is guarded by `... is null`, so re-running will not
-- clobber values already set (including any manual corrections). Safe to run
-- twice.
--
-- ┌─ BACKFILL LOGIC (one line) ─────────────────────────────────────────────┐
-- │ routing_mode  = 'bespoke' when the row's tenant slug is in the           │
-- │                 BESPOKE_SITE_TENANTS list below, else 'template'.        │
-- │ status        = 'active' when the existing active flag is true, else     │
-- │                 'archived'.                                              │
-- │ vercel_project = the single serving project (see CONFIRM note below).    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- WHY slug, not a per-row rule: middleware.ts decides the site subtree with
-- `BESPOKE_SITE_TENANTS.has(tenant.slug)` (src/middleware.ts:427). This backfill
-- mirrors that EXACTLY so the DB reflects current runtime routing 1:1. The slug
-- list below is copied verbatim from src/middleware.ts:401-424 — keep them in
-- sync until the middleware set is retired in favor of this column.

-- ── routing_mode ──────────────────────────────────────────────────────────
-- ROOT_SITE_TENANTS is currently empty in middleware.ts, so only the
-- bespoke/template split matters here.
update tenant_domains td
set routing_mode = 'bespoke'
from tenants t
where td.tenant_id = t.id
  and td.routing_mode is null
  and t.slug in (
    'nycmaid',
    'we-pay-you-junk',
    'nyc-mobile-salon',
    'the-florida-maid',
    'the-nyc-exterminator',
    'nyc-tow',
    'nycroadsideemergencyassistance',
    'theroadsidehelper',
    'toll-trucks-near-me',
    'sunnyside-clean-nyc',
    'wash-and-fold-nyc',
    'wash-and-fold-hoboken',
    'landscaping-in-nyc',
    'debt-service-ratio-loan',
    'fla-dumpster-rentals',
    'stretch-ny',
    'stretch-service',
    'the-home-services-company',
    'the-nyc-interior-designer',
    'the-nyc-marketing-company',
    'the-nyc-seo',
    'consortium-nyc'
  );

-- Everything still NULL is a template tenant.
update tenant_domains
set routing_mode = 'template'
where routing_mode is null;

-- ── status ────────────────────────────────────────────────────────────────
-- Map from the existing `active` boolean. 'pending' is not derivable from
-- current data (no signal for it), so backfilled rows are only active/archived;
-- 'pending' is reserved for future onboarding writes.
update tenant_domains
set status = case when active then 'active' else 'archived' end
where status is null;

-- ── vercel_project ────────────────────────────────────────────────────────
-- CONFIRM BEFORE RUNNING: every tenant serves from a SINGLE Vercel project
-- today. The value below is the code's own fallback
-- (process.env.VERCEL_PROJECT_ID || 'fullloopcrm', see src/lib/vercel-domains.ts).
-- If the real Vercel project name/id differs (check `vercel project ls` or the
-- dashboard), replace 'fullloopcrm' here. Per-tenant projects are a later phase.
update tenant_domains
set vercel_project = 'fullloopcrm'
where vercel_project is null;

-- ── Verification (run after the UPDATEs; expect zero rows) ─────────────────
-- SELECT id, tenant_id, domain, routing_mode, vercel_project, status
--   FROM tenant_domains
--  WHERE routing_mode IS NULL OR vercel_project IS NULL OR status IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- OPEN QUESTION FOR LEADER / JEFF (do not silently resolve):
--   Migration 043 seeded nycmaid's two domains against `tenants.slug =
--   'the-nyc-maid'`, but the bespoke set + site folder use slug 'nycmaid'.
--   If nycmaid's real tenants.slug is 'nycmaid', migration 043 inserted ZERO
--   domain rows (no slug match) and nycmaid has NO tenant_domains rows to
--   backfill — it resolves purely via the tenants.domain fallback. If it is
--   'the-nyc-maid', then its rows exist but the middleware BESPOKE check
--   ('nycmaid') would not match its slug — a latent routing question.
--   This backfill mirrors middleware verbatim (slug -> routing_mode), so it is
--   correct either way for the rows that DO exist. Resolve the slug question
--   before relying on tenant_domains as the sole routing source.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── OPTIONAL, NOT PART OF THIS BACKFILL — leader/Jeff decision ─────────────
-- The order was to backfill "every existing tenant_domains row." Most tenants
-- likely have NO tenant_domains row yet (043 only seeded nycmaid). For those,
-- W2's resolver falls back to tenants.domain, which carries no routing_mode /
-- vercel_project / status. To make tenant_domains the SOLE routing source, one
-- row per tenant-with-a-domain must be inserted. That is a larger change than
-- "backfill existing rows," so it is left here as a reviewed plan, commented
-- out. Enable only after Jeff approves seeding rows for all tenants.
--
-- INSERT INTO tenant_domains
--   (tenant_id, domain, active, is_primary, routing_mode, vercel_project, status, notes)
-- SELECT
--   t.id,
--   t.domain,
--   true,
--   true,
--   CASE WHEN t.slug IN (/* same bespoke list as above */) THEN 'bespoke' ELSE 'template' END,
--   'fullloopcrm',   -- CONFIRM, same as above
--   'active',
--   'Seeded from tenants.domain by 055 backfill (optional gap-fill step)'
-- FROM tenants t
-- WHERE t.domain IS NOT NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM tenant_domains td WHERE td.tenant_id = t.id AND td.domain = t.domain
--   )
-- ON CONFLICT (domain) DO NOTHING;
