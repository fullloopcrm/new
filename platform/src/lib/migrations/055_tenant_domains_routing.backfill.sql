-- 055_tenant_domains_routing.backfill.sql
-- P1 schema lane (W1). Backfills the nullable columns added by
-- 055_tenant_domains_routing.sql for EVERY tenant_domains row, from the current
-- source of truth (tenants.slug + the BESPOKE_SITE_TENANTS set in
-- src/middleware.ts). MUST run AFTER 055 and BEFORE 056 (the NOT NULL step).
--
-- Steps, in order:
--   0. COVERAGE SEED  — create one skeleton tenant_domains row per tenants.domain
--                       that has none yet (so every tenants.domain is covered).
--   1. routing_mode   — bespoke vs template from the slug list.
--   2. status         — from the existing active boolean.
--   3. vercel_project — the single serving project.
--   4. VERIFICATION   — built-in fail-loud gate (LEADER ORDER 11:57): every
--                       tenants.domain must have a tenant_domains row at the
--                       SAME tenant_id, or the whole backfill RAISES/rolls back.
--
-- Idempotent: the seed is guarded by NOT EXISTS + ON CONFLICT DO NOTHING, and
-- every UPDATE is guarded by `... is null`, so re-running will not clobber
-- values already set (including any manual corrections). Safe to run twice.
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

-- ── STEP 0: coverage seed (must run FIRST) ────────────────────────────────
-- LEADER ORDER (11:57): the built-in verification at the bottom of this file
-- requires that EVERY tenants.domain has a tenant_domains row at the SAME
-- tenant_id. Most tenants have no tenant_domains row yet (043 only seeded
-- nycmaid), so first create one skeleton row per tenants.domain that is
-- missing. routing_mode / status / vercel_project are left NULL here and get
-- populated by the UPDATEs below — DRY: the bespoke-slug list lives in exactly
-- one place (the routing_mode UPDATE), never duplicated here.
--
-- ON CONFLICT (domain) DO NOTHING is load-bearing: if a domain already exists
-- under a DIFFERENT tenant (a mis-seeded / swapped row), we do NOT overwrite or
-- reassign it. We leave it, and the verification step FAILS LOUD on the
-- mismatch instead of silently papering over a cross-tenant swap.
insert into tenant_domains (tenant_id, domain, active, is_primary, notes)
select
  t.id,
  t.domain,
  true,
  -- is_primary only when this tenant has no domain rows yet, so we never create
  -- a SECOND is_primary=true row for tenants already seeded (e.g. nycmaid/043).
  not exists (select 1 from tenant_domains td2 where td2.tenant_id = t.id),
  'Seeded from tenants.domain by 055 backfill (coverage for verification)'
from tenants t
where t.domain is not null
  and t.domain <> ''
  and not exists (
    select 1 from tenant_domains td where td.domain = t.domain
  )
on conflict (domain) do nothing;

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
-- NOTE ON nycmaid slug (context, not a blocker now):
--   Migration 043 seeded nycmaid's two alias domains against `tenants.slug =
--   'the-nyc-maid'`, while the bespoke set + site folder use slug 'nycmaid'.
--   STEP 0 above now seeds nycmaid's CANONICAL tenants.domain regardless of
--   slug, so coverage no longer depends on that mismatch. routing_mode for
--   nycmaid still follows the slug list (mirrors middleware verbatim), so if
--   the real slug is 'the-nyc-maid' its rows resolve as 'template', not
--   'bespoke' — resolve the slug question before treating tenant_domains as the
--   SOLE routing source. This does not affect the coverage verification below.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- BUILT-IN VERIFICATION (LEADER ORDER 11:57) — do NOT "pass" on disagreement.
-- Every tenants.domain (non-empty) must have a tenant_domains row at the SAME
-- tenant_id. tenant_domains.domain is UNIQUE, so each tenants.domain is exactly
-- one of: matched / mismatch (td points at a different tenant — the swap
-- hazard) / orphan (no td row for that domain at all).
--
-- Run this file with:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>
-- so a RAISE EXCEPTION HALTs with a nonzero exit and rolls the backfill back.
-- The row-by-row report of offenders lives in
-- 055_tenant_domains_routing.verify.sql (run that to SEE which rows disagree).
do $$
declare
  matched    bigint;
  orphans    bigint;
  mismatches bigint;
begin
  select count(*) into matched
    from tenants t
    join tenant_domains td on td.domain = t.domain and td.tenant_id = t.id
   where t.domain is not null and t.domain <> '';

  select count(*) into orphans
    from tenants t
   where t.domain is not null and t.domain <> ''
     and not exists (select 1 from tenant_domains td where td.domain = t.domain);

  select count(*) into mismatches
    from tenants t
    join tenant_domains td on td.domain = t.domain
   where t.domain is not null and t.domain <> '' and td.tenant_id <> t.id;

  raise notice 'tenant_domains coverage: matched=%, orphans=%, mismatches=%',
    matched, orphans, mismatches;

  if orphans > 0 or mismatches > 0 then
    raise exception
      'tenant_domains verification FAILED: % orphan + % mismatch tenants.domain row(s). Run 055_tenant_domains_routing.verify.sql to list them. Backfill rolled back.',
      orphans, mismatches;
  end if;

  raise notice
    'tenant_domains verification PASSED: all % tenants.domain row(s) have a matching tenant_domains row at the same tenant_id.',
    matched;
end $$;
