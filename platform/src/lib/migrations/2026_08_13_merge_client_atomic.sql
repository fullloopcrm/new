-- Atomicity fix for src/lib/client-merge.ts's mergeClients(): it previously
-- did the primary-demote, per-table repoint, and duplicate-retire as
-- separate sequential Supabase calls with no surrounding transaction. Fine
-- when a human triggered one merge at a time and could notice/retry a
-- failure. Not fine now that the 2026-08-13 automated dedupe cron calls it
-- unattended, nightly, across every tenant -- a network blip or a table-level
-- error partway through (e.g. an unexpected job_seq collision the pre-check
-- missed) would leave some tables repointed and others not, with no one
-- watching to catch it.
--
-- Same shape as create_booking_atomic (2026_07_13_client_book_dedupe_atomic.sql):
-- fold every write into one plpgsql function so it's one transaction. The
-- table list is passed in from client-merge.ts's own REPOINT_TABLES
-- constant (never user input) and used only via %I identifier quoting, so
-- there's no injection surface despite the dynamic SQL.
CREATE OR REPLACE FUNCTION public.merge_client_atomic(
  p_tenant_id uuid,
  p_canonical_id uuid,
  p_duplicate_id uuid,
  p_repoint_tables text[],
  p_merge_note text,
  p_existing_notes text
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_table text;
  v_count int;
  v_moved jsonb := '{}'::jsonb;
  v_new_notes text;
  v_canonical_exists boolean;
  v_duplicate_exists boolean;
BEGIN
  -- Lock both rows for the duration of the transaction, and confirm both
  -- belong to this tenant before touching anything -- same tenant-safety
  -- check the JS caller did, re-verified here since this function is the
  -- one now doing the actual writes.
  SELECT EXISTS(SELECT 1 FROM public.clients WHERE id = p_canonical_id AND tenant_id = p_tenant_id FOR UPDATE) INTO v_canonical_exists;
  SELECT EXISTS(SELECT 1 FROM public.clients WHERE id = p_duplicate_id AND tenant_id = p_tenant_id FOR UPDATE) INTO v_duplicate_exists;
  IF NOT v_canonical_exists OR NOT v_duplicate_exists THEN
    RAISE EXCEPTION 'canonical or duplicate client not found for this tenant';
  END IF;

  UPDATE public.client_contacts SET is_primary = false WHERE client_id = p_duplicate_id AND tenant_id = p_tenant_id;
  UPDATE public.client_properties SET is_primary = false WHERE client_id = p_duplicate_id AND tenant_id = p_tenant_id;

  FOREACH v_table IN ARRAY p_repoint_tables LOOP
    EXECUTE format('UPDATE public.%I SET client_id = $1 WHERE client_id = $2 AND tenant_id = $3', v_table)
      USING p_canonical_id, p_duplicate_id, p_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_moved := v_moved || jsonb_build_object(v_table, v_count);
  END LOOP;

  v_new_notes := CASE
    WHEN p_existing_notes IS NOT NULL AND p_existing_notes <> '' THEN p_merge_note || E'\n' || p_existing_notes
    ELSE p_merge_note
  END;

  UPDATE public.clients
    SET active = false, do_not_service = true, notes = v_new_notes
    WHERE id = p_duplicate_id AND tenant_id = p_tenant_id;

  RETURN v_moved;
END;
$$;
