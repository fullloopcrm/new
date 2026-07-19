-- 2026-07-11 RLS defense-in-depth: enable RLS on the 15 previously-OFF public tables
-- + tenant_isolation policy on the 3 that carry tenant_id. App uses service-role
-- (bypasses RLS) so this is safe; verified tenant sites still 200 after apply.
-- APPLIED to prod 2026-07-11 via Mgmt API. Rollback: ALTER TABLE .. DISABLE ROW LEVEL SECURITY.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'booking_assignees','contacts','crew_members','jefe_acks','jefe_messages',
    'jefe_snapshots','leads','partner_requests','platform_announcements','platform_feedback',
    'platform_settings','rate_limit_events','resale_assets','tenant_health','year_end_runs'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['resale_assets','tenant_health','year_end_runs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format('CREATE POLICY tenant_isolation ON public.%I USING (((current_setting(''request.jwt.claims'', true))::jsonb ->> ''tenant_id'') = (tenant_id)::text)', t);
  END LOOP;
END $$;
