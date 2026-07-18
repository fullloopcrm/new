-- 2026_07_18_tucker_landscaping_preset_crews.sql
--
-- Data-only backfill (no schema change — reuses crews/crew_members from
-- migrations/2026_07_03_crews.sql). Creates 3 preset crews for Tucker's
-- Landscaping (tenant cf50c81f-f726-48e0-82a8-673f1112fbe8) out of whatever
-- REAL, active team_members already exist for that tenant, round-robined
-- (up to 3 members each, up to 9 members total) into:
--   Maintenance Crew, Install Crew, Hardscape Crew
--
-- NOT WRITTEN AGAINST A KNOWN ROSTER: this worker (schema+backfill lane) does
-- not run DB reads, so the actual team_members roster for this tenant was
-- never queried. The script below reads it live, at apply-time:
--   - If the tenant has zero active team_members, it does nothing and raises
--     a NOTICE — that means fake team_members need to be created FIRST (as a
--     separate DB op) before this backfill can do anything.
--   - If crews already exist for this tenant, it does nothing (idempotent —
--     safe to re-run without duplicating crews on a partial apply).
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 \
--        -U postgres -d postgres -f src/lib/migrations/2026_07_18_tucker_landscaping_preset_crews.sql

BEGIN;

DO $$
DECLARE
  v_tenant_id uuid := 'cf50c81f-f726-48e0-82a8-673f1112fbe8';
  v_member_count int;
  v_crew_ids uuid[3];
  v_crew_names text[3] := ARRAY['Maintenance Crew', 'Install Crew', 'Hardscape Crew'];
  v_rec record;
  v_idx int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM crews WHERE tenant_id = v_tenant_id) THEN
    RAISE NOTICE 'Tucker''s Landscaping already has crews — skipping (idempotent no-op).';
    RETURN;
  END IF;

  SELECT count(*) INTO v_member_count
  FROM team_members
  WHERE tenant_id = v_tenant_id AND status IS DISTINCT FROM 'inactive';

  IF v_member_count = 0 THEN
    RAISE NOTICE 'Tucker''s Landscaping (tenant %) has ZERO active team_members — cannot create real preset crews. Create real (or placeholder) team_members for this tenant first, then re-run this script.', v_tenant_id;
    RETURN;
  END IF;

  IF v_member_count < 2 THEN
    RAISE NOTICE 'Tucker''s Landscaping has only % active team_member(s) — creating crews anyway, but teams will be smaller than the requested 2-3 members each.', v_member_count;
  END IF;

  -- Create the 3 named crews.
  FOR v_idx IN 1..3 LOOP
    INSERT INTO crews (tenant_id, name)
    VALUES (v_tenant_id, v_crew_names[v_idx])
    RETURNING id INTO v_crew_ids[v_idx];
  END LOOP;

  -- Round-robin up to the first 9 real, active team_members (3 per crew) into
  -- the 3 crews just created, ordered by created_at for a deterministic split.
  v_idx := 0;
  FOR v_rec IN
    SELECT id
    FROM team_members
    WHERE tenant_id = v_tenant_id AND status IS DISTINCT FROM 'inactive'
    ORDER BY created_at
    LIMIT 9
  LOOP
    INSERT INTO crew_members (crew_id, team_member_id)
    VALUES (v_crew_ids[(v_idx % 3) + 1], v_rec.id)
    ON CONFLICT (crew_id, team_member_id) DO NOTHING;
    v_idx := v_idx + 1;
  END LOOP;

  RAISE NOTICE 'Created 3 preset crews for Tucker''s Landscaping from % real team_member(s).', v_member_count;
END $$;

COMMIT;
