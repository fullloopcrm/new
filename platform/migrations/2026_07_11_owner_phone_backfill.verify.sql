-- Owner-phone backfill VERIFY (2026-07-11)  [P1-1 / Part-0 precondition gate]
--
-- Pairs with: 2026_07_11_owner_phone_backfill.sql (same directory).
-- Read-only. The only writes this file could make are RAISE — no data changes.
-- Safe to run any number of times, before or after the backfill.
--
-- WHY THIS GATE EXISTS
-- The per-tenant owner-identity fix (commit 017043fa, agent.ts isOwnerOfTenant)
-- is FAIL-CLOSED: a non-flagship tenant whose owner_phone is NULL/blank locks its
-- real owner OUT of owner-only tooling (OTP / PIN). The booking-owner deploy MUST
-- NOT ship until every *active* tenant has a populated owner_phone. This is the
-- Part-0 precondition: it FAILS LOUD (nonzero exit) if any active tenant would be
-- locked out, so the release is blocked rather than silently darking owners.
--
-- SCOPE OF THE GATE (what a residual NULL means, and when it is / isn't fatal):
--   * status = 'active'  -> FATAL. These owners are live and would be locked out.
--   * status <> 'active' (suspended / cancelled) -> reported, NOT fatal. Those
--     owners are not actively using owner tooling; a NULL there is not a lockout.
--   * FLAGSHIP (slug in 'nycmaid'/'the-nyc-maid', or the seed tenant
--     00000000-0000-0000-0000-000000000001) -> excluded. The flagship's owner
--     access is preserved by the legacy OWNER_PHONES env per the 017043fa design,
--     so its owner_phone being NULL is by-design, not a lockout. Guarding BOTH
--     flagship slugs matches the flagship identity used by migration 061 and is
--     strictly safer than guarding 'nycmaid' alone.
--
-- HOW TO RUN (so a failure HALTs with a nonzero exit code):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 2026_07_11_owner_phone_backfill.verify.sql
--
-- A "populated" owner_phone means NULLIF(btrim(owner_phone), '') IS NOT NULL —
-- i.e. non-NULL AND not blank/whitespace — the same emptiness test the backfill
-- uses, so this gate and the backfill agree on exactly what counts as filled.

\echo '== 1. Active tenants STILL missing owner_phone (expect ZERO rows) — these BLOCK the deploy =='
select t.id, t.slug, t.name, t.industry, t.owner_name, t.owner_email, t.phone as business_phone
  from tenants t
 where nullif(btrim(t.owner_phone), '') is null
   and t.status = 'active'
   and t.id <> '00000000-0000-0000-0000-000000000001'::uuid
   and t.slug not in ('nycmaid', 'the-nyc-maid')
 order by t.name;

\echo '== 2. Non-active tenants missing owner_phone (informational only — NOT a blocker) =='
select t.id, t.slug, t.name, t.status, t.owner_name, t.owner_email
  from tenants t
 where nullif(btrim(t.owner_phone), '') is null
   and t.status is distinct from 'active'
   and t.id <> '00000000-0000-0000-0000-000000000001'::uuid
   and t.slug not in ('nycmaid', 'the-nyc-maid')
 order by t.status, t.name;

\echo '== 3. Coverage summary (active tenants) =='
select
    count(*)                                                              as active_total,
    count(*) filter (where nullif(btrim(owner_phone), '') is not null)    as active_with_phone,
    count(*) filter (where nullif(btrim(owner_phone), '') is null)        as active_missing_phone
  from tenants
 where status = 'active'
   and id <> '00000000-0000-0000-0000-000000000001'::uuid
   and slug not in ('nycmaid', 'the-nyc-maid');

\echo '== 4. GATE: FAIL LOUD if any active, non-flagship tenant has NULL/blank owner_phone =='
do $$
declare
  v_blocked bigint;
  v_slugs   text;
begin
  select count(*),
         string_agg(coalesce(slug, id::text), ', ' order by slug)
    into v_blocked, v_slugs
    from tenants
   where nullif(btrim(owner_phone), '') is null
     and status = 'active'
     and id <> '00000000-0000-0000-0000-000000000001'::uuid
     and slug not in ('nycmaid', 'the-nyc-maid');

  if v_blocked > 0 then
    raise exception
      'owner_phone verify FAILED: % active tenant(s) still have NULL/blank owner_phone and WILL be locked out of owner tooling by the fail-closed check (017043fa). Populate owner_phone for these before deploying booking-owner: %. See section 1 above.',
      v_blocked, v_slugs;
  end if;

  raise notice
    'owner_phone verify PASSED: every active, non-flagship tenant has a populated owner_phone. Part-0 precondition satisfied.';
end $$;
