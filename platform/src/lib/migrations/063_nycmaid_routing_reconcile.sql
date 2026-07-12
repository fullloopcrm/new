-- 063_nycmaid_routing_reconcile.sql
-- RENUMBERED 061 -> 063 (2026-07-12): 061 collided with W2's
-- 061_unique_journal_entries.sql, and 062 is already taken by
-- 062_add_tenant_id_inbound_emails.sql (integ/wave2 run-order pack). 063 is the
-- next free slot. See 063_nycmaid_routing_reconcile.RENUMBER.md. Apply order is
-- unaffected: this reconcile still runs after the 055 backfill and 056/059/060,
-- and is independent of 061/062 (different tables).
-- P1 schema lane (W1). FLAGSHIP ROUTING RECONCILE — FILE ONLY, do NOT execute
-- here; the leader runs prod DDL after Jeff approves.
--
-- ── WHY (W1 Q7 finding) ───────────────────────────────────────────────────
-- Migration 043 seeded nycmaid's two live alias domains against
--   `tenants.slug = 'the-nyc-maid'`   (043_tenant_domains.sql:27,32)
-- but every runtime routing key for the flagship uses slug `nycmaid`:
--   - src/middleware.ts BESPOKE_SITE_TENANTS contains 'nycmaid' (not 'the-nyc-maid')
--   - the bespoke site subtree is src/app/site/nycmaid/*
--   - the 055 backfill routing_mode list contains 'nycmaid'
-- So the DB slug used by 043 and the slug used by all routing disagree. Two
-- consequences, and this file is robust to BOTH because we cannot run a query
-- to learn which is the real slug:
--   Case A (real slug = 'nycmaid'): 043's WHERE matched ZERO rows, so the alias
--     domains (thenycmaid.com / thenewyorkcitymaid.com) may be MISSING from
--     tenant_domains. The 055 backfill STEP 0 only seeds the single canonical
--     tenants.domain, so an alias host would not resolve → would NOT route
--     bespoke once tenant_domains is authoritative (W2 resolver).
--   Case B (real slug = 'the-nyc-maid'): the alias rows exist, but the 055
--     backfill set their routing_mode to 'template' (slug not in its list) →
--     the flagship routes to the shared template, a REGRESSION, once
--     tenant_domains is authoritative.
--
-- ── WHAT (chosen fix) ─────────────────────────────────────────────────────
-- Reconcile the tenant_domains MAPPING (not tenants.slug). We do NOT rewrite
-- tenants.slug: middleware, the /site/nycmaid folder, BESPOKE_SITE_TENANTS, and
-- scripts/verify-protected-tenants.mjs all key on 'nycmaid', so a slug rewrite
-- has broad, hard-to-reverse blast radius. Instead we make the DATA correct so
-- that once W2's resolver treats tenant_domains as authoritative, every nycmaid
-- domain routes bespoke — which is exactly the state the P1 spec targets.
--
-- Identity is resolved SLUG-AGNOSTICALLY via `slug in ('nycmaid','the-nyc-maid')`
-- — the union of both known aliases of the one flagship business. No other
-- tenant claims either slug, so this touches ONLY nycmaid. A hard guard RAISES
-- if that predicate matches 0 or >1 tenants (never guess which flagship row).
--
-- ── GUARANTEES ────────────────────────────────────────────────────────────
--   * Touches ONLY rows whose tenant_id = the single resolved nycmaid tenant.
--   * Only ever WRITES routing_mode = 'bespoke'. It NEVER writes 'template',
--     so it cannot regress the flagship — worst case it is a no-op confirm.
--   * Idempotent: existence inserts are ON CONFLICT (domain) DO NOTHING; the
--     UPDATE is guarded `is distinct from 'bespoke'`. Safe to run twice.
--   * FAIL-LOUD: RAISES (rolls back) if the flagship tenant is missing/ambiguous
--     or if either alias domain is already owned by a DIFFERENT tenant (a
--     cross-tenant swap we must NOT paper over).
--
-- ── RUN ORDER ─────────────────────────────────────────────────────────────
-- Apply AFTER 055_tenant_domains_routing.backfill.sql. Safe after 056/059/060
-- too: it only writes CHECK-valid values, and every INSERT supplies
-- routing_mode/status/vercel_project so it does not violate the 056 NOT NULLs.
-- Run so a failure HALTs and rolls back:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 063_nycmaid_routing_reconcile.sql
--
-- The two live alias domains are copied verbatim from 043 (the only source that
-- names them). Keep in sync with 043 if that seed ever changes.

-- ═══════════════════════════════════════════════════════════════════════════
-- PRE-VERIFY (read-only; run before the reconcile to see the starting state).
-- Expect: the flagship tenant + whatever domain rows exist and their current
-- routing_mode (this is what we are about to correct).
-- ═══════════════════════════════════════════════════════════════════════════
-- select t.id as tenant_id, t.slug, t.domain as tenants_domain,
--        td.domain, td.routing_mode, td.status, td.vercel_project, td.is_primary
--   from tenants t
--   left join tenant_domains td on td.tenant_id = t.id
--  where t.slug in ('nycmaid', 'the-nyc-maid')
--  order by td.is_primary desc nulls last, td.domain;

-- ═══════════════════════════════════════════════════════════════════════════
-- RECONCILE (guarded; writes ONLY nycmaid rows; only ever 'bespoke').
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  v_tenant_id uuid;
  v_matches   bigint;
  v_swap      bigint;
  v_updated   bigint;
  v_inserted  bigint;
  v_nonbespoke bigint;
  v_missing    bigint;
  -- The flagship's live alias domains (verbatim from migration 043).
  v_domains   text[] := array['thenycmaid.com', 'thenewyorkcitymaid.com'];
begin
  -- 1. Resolve the ONE flagship tenant, slug-agnostically. Fail loud on 0 or >1.
  select count(*) into v_matches
    from tenants where slug in ('nycmaid', 'the-nyc-maid');

  if v_matches = 0 then
    raise exception
      '063 reconcile ABORTED: no tenant with slug in (nycmaid, the-nyc-maid). Flagship not found — nothing to reconcile, and guessing would be wrong.';
  elsif v_matches > 1 then
    raise exception
      '063 reconcile ABORTED: % tenants claim slug in (nycmaid, the-nyc-maid). Ambiguous flagship identity — refusing to touch any row until resolved by hand.',
      v_matches;
  end if;

  select id into v_tenant_id
    from tenants where slug in ('nycmaid', 'the-nyc-maid');

  -- 2. Guard: neither alias domain may already be owned by a DIFFERENT tenant.
  --    ON CONFLICT DO NOTHING would silently leave such a row mis-routed, so we
  --    detect and RAISE instead of papering over a cross-tenant swap.
  select count(*) into v_swap
    from tenant_domains
   where domain = any(v_domains)
     and tenant_id <> v_tenant_id;

  if v_swap > 0 then
    raise exception
      '063 reconcile ABORTED: % of nycmaid''s alias domain(s) are owned by a DIFFERENT tenant_id than the flagship (%). Cross-tenant swap — fix the ownership by hand before reconciling routing.',
      v_swap, v_tenant_id;
  end if;

  -- 3. Ensure BOTH live alias domains exist, attached to the flagship, bespoke.
  --    Supplies routing_mode/status/vercel_project so this is valid even after
  --    056 enforces NOT NULL. is_primary mirrors the 055 STEP-0 rule: primary
  --    only if the tenant has no primary row yet (never create a 2nd primary).
  --    vercel_project reuses the flagship's existing project if any row has one,
  --    else the documented code fallback 'fullloopcrm' (matches 055/059).
  with existing_vercel as (
    select vercel_project
      from tenant_domains
     where tenant_id = v_tenant_id and vercel_project is not null
     limit 1
  ),
  ins as (
    insert into tenant_domains
      (tenant_id, domain, active, is_primary, routing_mode, status, vercel_project, notes)
    select
      v_tenant_id,
      d,
      true,
      -- primary only for the first alias AND only if no primary exists yet
      (d = 'thenewyorkcitymaid.com')
        and not exists (
          select 1 from tenant_domains td2
           where td2.tenant_id = v_tenant_id and td2.is_primary
        ),
      'bespoke',
      'active',
      coalesce((select vercel_project from existing_vercel), 'fullloopcrm'),
      'Reconciled by migration 063 (nycmaid slug/routing reconcile)'
    from unnest(v_domains) as d
    on conflict (domain) do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  -- 4. Force routing_mode = 'bespoke' for EVERY domain row of the flagship.
  --    Scoped strictly by tenant_id → touches ONLY nycmaid. Only ever 'bespoke'
  --    (never 'template'), so it cannot regress the flagship. Also backfills any
  --    NULL status/vercel_project on pre-existing rows so 056 stays satisfiable.
  with upd as (
    update tenant_domains
       set routing_mode   = 'bespoke',
           status         = coalesce(status, 'active'),
           vercel_project = coalesce(vercel_project, 'fullloopcrm')
     where tenant_id = v_tenant_id
       and (routing_mode is distinct from 'bespoke'
            or status is null
            or vercel_project is null)
    returning 1
  )
  select count(*) into v_updated from upd;

  raise notice
    '063 reconcile OK: flagship tenant_id=%, alias rows inserted=%, rows set bespoke/backfilled=%.',
    v_tenant_id, v_inserted, v_updated;

  -- 5. POST-VERIFY (in-transaction; rolls back on failure). Every domain row of
  --    the flagship must now be bespoke, and BOTH alias domains must be present
  --    and owned by the flagship.
  select count(*) into v_nonbespoke
    from tenant_domains
   where tenant_id = v_tenant_id
     and routing_mode is distinct from 'bespoke';

  select count(*) into v_missing
    from unnest(v_domains) as d
   where not exists (
     select 1 from tenant_domains td
      where td.domain = d and td.tenant_id = v_tenant_id
   );

  if v_nonbespoke > 0 then
    raise exception
      '063 post-verify FAILED: % flagship domain row(s) are still NOT bespoke. Rolled back.',
      v_nonbespoke;
  end if;

  if v_missing > 0 then
    raise exception
      '063 post-verify FAILED: % of nycmaid''s alias domain(s) still absent for the flagship tenant. Rolled back.',
      v_missing;
  end if;

  raise notice
    '063 post-verify PASSED: all flagship domain rows are bespoke and both alias domains are present under tenant_id=%.',
    v_tenant_id;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- POST-VERIFY (read-only; re-run any time after 063 to confirm the end state).
-- Expect: every row routing_mode = 'bespoke'; thenycmaid.com and
-- thenewyorkcitymaid.com both present under the same tenant_id.
-- ═══════════════════════════════════════════════════════════════════════════
-- select t.slug, td.domain, td.routing_mode, td.status, td.vercel_project, td.is_primary
--   from tenants t
--   join tenant_domains td on td.tenant_id = t.id
--  where t.slug in ('nycmaid', 'the-nyc-maid')
--  order by td.is_primary desc, td.domain;
