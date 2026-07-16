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
