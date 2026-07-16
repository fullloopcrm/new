-- tenants.setup_progress / tenants.selena_config: close a lost-update race.
--
-- PUT /api/admin/businesses/[id] merges partial JSON patches into these two
-- jsonb columns by reading the current value, spreading the patch over it in
-- JS, then writing the merged blob back with the rest of the route's
-- unrelated field updates in one blind UPDATE. Two concurrent saves for the
-- SAME tenant -- one admin checking off "domain_added_vercel" on the
-- onboarding checklist while another checks off "dns_a_record" in a second
-- tab, or a service-area save racing a persona/pricing save on
-- selena_config -- both read the same stale blob and the second write's
-- merge is based on that stale snapshot, so it silently overwrites the
-- first admin's change: a checked-off onboarding step (or a persona/pricing
-- setting) reverts with no error to either admin.
--
-- Fix: fold the read-merge-write into one atomic UPDATE per jsonb column
-- (Postgres's `||` does the same shallow merge the JS spread was doing), so
-- concurrent calls for the same tenant serialize on the row's write lock
-- instead of racing on a stale JS-side snapshot. No schema change.
CREATE OR REPLACE FUNCTION public.merge_tenant_setup_progress(
  p_tenant_id uuid,
  p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.tenants
  SET setup_progress = COALESCE(setup_progress, '{}'::jsonb) || p_patch
  WHERE id = p_tenant_id
  RETURNING setup_progress INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_tenant_selena_config(
  p_tenant_id uuid,
  p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.tenants
  SET selena_config = COALESCE(selena_config, '{}'::jsonb) || p_patch
  WHERE id = p_tenant_id
  RETURNING selena_config INTO v_result;

  RETURN v_result;
END;
$$;

-- tenants.compliance: same read-merge-write clobber, found on
-- PATCH /api/admin/businesses/[id]/profile (the canonical one-form live-save
-- profile UI -- routeProfileWrite() sends a fresh PATCH per field edit, so
-- two fields saved in quick succession, or two admins editing the same
-- tenant's compliance section in separate tabs, both read the same stale
-- `compliance` blob and the second write silently reverts the first field's
-- save). No existing RPC covered this column.
CREATE OR REPLACE FUNCTION public.merge_tenant_compliance(
  p_tenant_id uuid,
  p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.tenants
  SET compliance = COALESCE(compliance, '{}'::jsonb) || p_patch
  WHERE id = p_tenant_id
  RETURNING compliance INTO v_result;

  RETURN v_result;
END;
$$;

-- POST /api/setup-checklist's "uncomplete_key" toggle-off has the same
-- read-merge-write shape but needs to REMOVE a key, not merge one in --
-- `||` can't do that, so it needs its own atomic Postgres-side op (jsonb `-`
-- key-removal), same race rationale as merge_tenant_setup_progress above.
CREATE OR REPLACE FUNCTION public.remove_tenant_setup_progress_key(
  p_tenant_id uuid,
  p_key text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.tenants
  SET setup_progress = COALESCE(setup_progress, '{}'::jsonb) - p_key
  WHERE id = p_tenant_id
  RETURNING setup_progress INTO v_result;

  RETURN v_result;
END;
$$;

-- tenants.admin_seats / team_seats / monthly_rate: the same lost-update race
-- as setup_progress/selena_config above, on plain integer columns instead of
-- jsonb. PUT /api/admin/businesses/[id] reads current admin_seats/team_seats,
-- merges the caller's partial patch (only one of the two may be present) in
-- JS, recomputes monthly_rate from the merged pair, then writes all three
-- back as part of the SAME blind `updates` UPDATE as every other field on
-- this route. One admin bumping admin_seats in one tab while another bumps
-- team_seats in a second tab both read the same stale pair -- whichever
-- write lands second silently reverts the first admin's seat change AND
-- recomputes monthly_rate off the wrong pair (undercharging or overcharging
-- the tenant), and the Stripe subscription sync that follows pushes the
-- now-divergent local seat count to Stripe, so the platform's own billing
-- record and Stripe's subscription can end up disagreeing.
--
-- Fix: merge the two seat counts atomically in one UPDATE (mirrors the jsonb
-- `||` fix above) and return the POST-merge values so the caller computes
-- monthly_rate from what's actually on the row, not a stale snapshot -- same
-- reasoning as GREATEST() floors already enforced in JS (admin_seats >= 1,
-- team_seats >= 0). Pricing-per-seat is passed in from the caller (src/lib/
-- billing-pricing.ts's PRICING constants) rather than duplicated here, so
-- the actual dollar amounts stay single-sourced in TS -- only the
-- (admins * rate + teamMembers * rate) arithmetic is mirrored, which is
-- stable and won't drift the way a hardcoded dollar constant would.
CREATE OR REPLACE FUNCTION public.merge_tenant_seats(
  p_tenant_id uuid,
  p_admin_seats integer,               -- NULL = keep existing
  p_team_seats integer,                -- NULL = keep existing
  p_admin_monthly_cents integer,
  p_team_member_monthly_cents integer
) RETURNS TABLE(admin_seats integer, team_seats integer, monthly_rate integer)
LANGUAGE plpgsql AS $$
DECLARE
  v_admins integer;
  v_team integer;
BEGIN
  UPDATE public.tenants t
  SET admin_seats = GREATEST(1, COALESCE(p_admin_seats, t.admin_seats)),
      team_seats = GREATEST(0, COALESCE(p_team_seats, t.team_seats))
  WHERE t.id = p_tenant_id
  RETURNING t.admin_seats, t.team_seats INTO v_admins, v_team;

  UPDATE public.tenants
  SET monthly_rate = v_admins * p_admin_monthly_cents + v_team * p_team_member_monthly_cents
  WHERE id = p_tenant_id;

  RETURN QUERY SELECT v_admins, v_team, (v_admins * p_admin_monthly_cents + v_team * p_team_member_monthly_cents);
END;
$$;
