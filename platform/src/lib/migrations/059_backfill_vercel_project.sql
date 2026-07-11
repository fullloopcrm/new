-- 059_backfill_vercel_project.sql
-- P1 schema lane (W1). Real (partial) backfill of tenant_domains.vercel_project
-- from the W1 Vercel audit (/tmp/w1-vercel-audit.md, 2026-07-11), replacing the
-- blanket value 055 wrote. Source: repo + config ONLY. NO live Vercel API, NO
-- prod DB was queried to author this — the leader runs it after review.
--
-- ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
-- 055_tenant_domains_routing.backfill.sql set EVERY row's vercel_project =
-- 'fullloopcrm' (its own code fallback). That is directionally right for the
-- domains FullLoop (FL) actually serves, but it makes a claim it cannot back up
-- for the bespoke tenants whose custom domain may STILL live on their original
-- standalone Vercel project (roadside pair, tow, salon, etc.). 056 was
-- deliberately changed to KEEP vercel_project NULLABLE (commit fe51884) so this
-- follow-up can set only what is determinable and leave the rest NULL.
--
-- This migration does exactly that:
--   • DETERMINABLE  -> set to the FL project (see FL_PROJECT below).
--   • UNKNOWN       -> reset to NULL (needs a live Vercel API check; list below).
--
-- ── WHAT IS DETERMINABLE FROM REPO ────────────────────────────────────────
-- FROM FL (served by the single FL platform project), determinable from code:
--   • ALL template-routed tenants — they are served via their
--     <slug>.fullloopcrm.com carrying subdomain, registered as FL *project*
--     domains (src/lib/vercel-domains.ts registerCarryingDomain). FL by
--     construction; no standalone project exists for them.
--   • 4 bespoke tenants with a hard FL routing signal in middleware.ts:
--       - the-florida-maid          (STATIC_TENANT_MAP -> FL, no standalone)
--       - consortium-nyc            (APEX_CANONICAL -> migrated to FL)
--       - the-nyc-interior-designer (APEX_CANONICAL -> migrated to FL)
--       - the-nyc-marketing-company (APEX_CANONICAL -> migrated to FL)
--
-- ── WHAT IS *NOT* DETERMINABLE (left NULL — needs live Vercel API) ─────────
-- The other 18 bespoke tenants (UNKNOWN_SLUGS below). middleware bespoke
-- routing does NOT tell us which Vercel project serves the custom domain, and
-- ~/.claude/access.json shows each still has a live standalone project that may
-- own the domain today. Two (nycroadsideemergencyassistance, theroadsidehelper)
-- were LIVE on their standalone projects as of 2026-06-28; nycmaid's cutover was
-- in progress. Marking these 'fullloopcrm' would assert a cutover that may not
-- have happened, so they are set to NULL.
--
-- The one live call that resolves most of them (run by the leader, not W1):
--   GET https://api.vercel.com/v9/projects/prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj/domains
--       ?teamId=team_WmAQi5rDfgFH3galhcIPhOHv&limit=100
--   -> every UNKNOWN domain present + verified here is truly on FL; set it to
--      FL_PROJECT. Any absent one is still on its standalone project.
-- Full per-domain call list: /tmp/w1-vercel-audit.md, section "Live Vercel API
-- checks needed".
--
-- ── VALUE STRING (CONFIRM IN REVIEW) ──────────────────────────────────────
-- FL_PROJECT is the stable Vercel projectId, NOT a name. The audit found the
-- FL project's NAME is ambiguous across sources ('fullloopcrm' in
-- .vercel/project.json vs 'platform' in access.json / the preview host
-- platform-ten-psi.vercel.app). The Vercel domains API accepts the id or the
-- name, and the id is rename-proof, so the id is the safe DB value.
--   -> If you prefer a name, change the single FL_PROJECT literal below to
--      'fullloopcrm' or 'platform' after confirming via:
--      GET https://api.vercel.com/v9/projects/prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj
--          ?teamId=team_WmAQi5rDfgFH3galhcIPhOHv   -> read .name
--
-- ── RUN ORDER / SAFETY ────────────────────────────────────────────────────
-- Run AFTER 055 add -> 055 backfill -> 056 enforce. Correct whether or not the
-- 055 blanket ran (the guards handle both NULL and the auto-set values).
-- Idempotent: re-running is a no-op. Manual overrides are preserved — the
-- guards only touch NULL and the known auto-set strings ('fullloopcrm' /
-- 'platform' / FL_PROJECT), never some other value a human set by hand.
--
-- Run with:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f <this file>

do $$
declare
  -- The FL platform project. projectId is rename-proof; see "VALUE STRING" above.
  fl_project text := 'prj_PtBsLFfrCvSYXzo60GlNAjPoPjbj';

  -- Bespoke tenants whose serving Vercel project CANNOT be determined from repo
  -- and must be resolved against the live Vercel API. Single source of truth for
  -- the two UPDATEs below. Keep in sync with /tmp/w1-vercel-audit.md.
  unknown_slugs text[] := array[
    'nycmaid',                          -- cutover in progress (NYCMAID-CUTOVER-RUNBOOK)
    'we-pay-you-junk',
    'nyc-mobile-salon',
    'the-nyc-exterminator',
    'nyc-tow',
    'nycroadsideemergencyassistance',   -- LIVE on standalone as of 2026-06-28
    'theroadsidehelper',                -- LIVE on standalone as of 2026-06-28
    'toll-trucks-near-me',
    'sunnyside-clean-nyc',              -- two-project trap: live on 'sunnyside-clean'
    'wash-and-fold-nyc',               -- access.json org/project incomplete
    'wash-and-fold-hoboken',           -- no own domain surfaced in repo
    'landscaping-in-nyc',
    'debt-service-ratio-loan',
    'fla-dumpster-rentals',
    'stretch-ny',
    'stretch-service',
    'the-home-services-company',       -- LOCAL_ONLY in access.json; may have no live domain
    'the-nyc-seo'
  ];

  -- Values written automatically by a prior backfill (055) or this file. Only
  -- these are safe to overwrite; anything else is a manual correction we keep.
  auto_values text[] := array['fullloopcrm', 'platform', fl_project];

  n_fl      bigint;
  n_unknown bigint;
begin
  -- ── DETERMINABLE -> FL_PROJECT ──────────────────────────────────────────
  -- Everything NOT in unknown_slugs == all template tenants + the 4 FL-signal
  -- bespoke tenants. Set them to the FL project (normalizes 055's 'fullloopcrm'
  -- to the stable id too). Guard leaves human-set values untouched.
  update tenant_domains td
  set vercel_project = fl_project
  from tenants t
  where td.tenant_id = t.id
    and not (t.slug = any(unknown_slugs))
    and (td.vercel_project is null or td.vercel_project = any(auto_values))
    and td.vercel_project is distinct from fl_project;

  -- ── UNKNOWN -> NULL ─────────────────────────────────────────────────────
  -- Undo the 055 blanket for the 18 bespoke tenants we cannot verify from repo.
  -- Only resets the auto-set strings; a manually-set project is preserved.
  update tenant_domains td
  set vercel_project = null
  from tenants t
  where td.tenant_id = t.id
    and t.slug = any(unknown_slugs)
    and td.vercel_project = any(auto_values);

  -- ── Report (visible in psql output) ─────────────────────────────────────
  select count(*) into n_fl
    from tenant_domains where vercel_project = fl_project;

  select count(*) into n_unknown
    from tenant_domains td
    join tenants t on t.id = td.tenant_id
   where t.slug = any(unknown_slugs) and td.vercel_project is null;

  raise notice
    '059 vercel_project backfill: % row(s) set to FL project (%); % unknown bespoke row(s) left NULL (need live Vercel API — see /tmp/w1-vercel-audit.md).',
    n_fl, fl_project, n_unknown;
end $$;
