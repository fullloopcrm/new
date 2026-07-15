-- 058_fix_nycmaid_routing.sql
--
-- Flip nycmaid's tenant_domains rows to routing_mode = 'bespoke'.
--
-- WHY: the P1 migration that added tenant_domains.routing_mode defaults existing
-- rows to 'template'. nycmaid is a PERMANENT-BESPOKE tenant — it is served by its
-- own hand-built /site/nycmaid subtree (see BESPOKE_SITE_TENANTS in
-- src/middleware.ts and TEMPLATE-MIGRATION-AUDIT.md), NOT the shared
-- /site/template. Leaving its host rows at routing_mode='template' would route
-- nycmaid's live custom domains to the wrong (shared-template) surface.
--
-- KEYING (deliberately NOT a slug guess): nycmaid's DB tenants.slug is
-- 'the-nyc-maid' — the slug migration 043 used to seed these exact
-- tenant_domains rows. The 'nycmaid' string that appears in the middleware
-- BESPOKE_SITE_TENANTS set and the /site/nycmaid directory is a SEPARATE
-- site-routing slug, NOT tenants.slug; keying on it would match zero rows.
-- To sidestep that ambiguity entirely, we anchor to the tenant that OWNS the
-- literal live domains 043 seeded (thenycmaid.com / thenewyorkcitymaid.com) and
-- flip every active tenant_domains row for that tenant_id. This catches all of
-- nycmaid's host rows, including any added by the routing_mode migration.
--
-- Idempotent: re-running sets the same rows to the same value.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 \
--        -U postgres -d postgres -f src/lib/migrations/058_fix_nycmaid_routing.sql
-- (Leader runs the prod write; requires the routing_mode migration to be applied first.)

BEGIN;

DO $$
DECLARE
  v_tenant_id uuid;
  v_updated   integer;
BEGIN
  -- Fail loud if the routing_mode column is not present yet: this migration must
  -- run AFTER the P1 migration that adds tenant_domains.routing_mode.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name  = 'tenant_domains'
      AND column_name = 'routing_mode'
  ) THEN
    RAISE EXCEPTION
      'tenant_domains.routing_mode does not exist — apply the P1 routing_mode migration before 058';
  END IF;

  -- Anchor on a literal live domain rather than a slug. Both canonical domains
  -- resolve to the same tenant; take the first that exists.
  SELECT tenant_id INTO v_tenant_id
  FROM tenant_domains
  WHERE domain IN ('thenycmaid.com', 'thenewyorkcitymaid.com')
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION
      'No tenant_domains row found for nycmaid (thenycmaid.com / thenewyorkcitymaid.com) — cannot key 058';
  END IF;

  UPDATE tenant_domains
  SET routing_mode = 'bespoke'
  WHERE tenant_id = v_tenant_id
    AND active = true
    AND routing_mode IS DISTINCT FROM 'bespoke';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '058: set routing_mode=bespoke on % nycmaid tenant_domains row(s) (tenant_id=%)',
    v_updated, v_tenant_id;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
