-- =====================================================================
-- MIGRATION RUN-ORDER VERIFICATION PACK
-- Covers migrations 060 (RPC lockdown), 061 (journal dedup unique index),
-- 062 (inbound_emails.tenant_id).
--
-- STATUS: READ-ONLY. Every statement in this file is a SELECT or a DO-block
--   that only RAISEs (NOTICE on pass / EXCEPTION on failure). NOTHING here
--   creates, alters, drops, grants, revokes, inserts, updates or deletes.
--   Run it by hand around each migration; it is safe to run against prod.
--
-- HOW TO USE (per migration, in this order):
--   1. Run that migration's PRE-RUN block(s) BEFORE applying the DDL.
--      A pre-run block that RAISEs EXCEPTION is a HARD STOP — do not apply
--      the migration until the reported condition is resolved.
--   2. Apply the migration (060, then 061, then 062).
--   3. Run that migration's POST-RUN block AFTER applying. It RAISEs
--      EXCEPTION if the migration did not land as intended.
--
-- AUTHORING NOTE (be explicit): at authoring time only migration 062 exists
--   in this repo (platform/src/lib/migrations/062_add_tenant_id_inbound_emails.sql).
--   Migrations 060 and 061 are GATED-PREP — not yet authored as files. These
--   checks therefore encode the INTENDED end-state, derived from live code:
--     * 060 targets the two SECURITY DEFINER RPCs granted to `authenticated`
--       in migration 039: post_journal_entry(...) and cpa_token_bump_usage(text).
--       The intended lockdown revokes EXECUTE from anon/authenticated/PUBLIC and
--       keeps EXECUTE for service_role (the app calls them via supabaseAdmin).
--     * 061's dedup key matches src/lib/ledger.ts journalEntryExists():
--       (tenant_id, source, source_id). source_id is nullable (manual entries
--       pass NULL), so the unique index MUST be partial: WHERE source_id IS NOT NULL.
--   The assertions test PROPERTIES (privilege revoked, a unique index over those
--   columns exists) rather than exact object names where possible, so they hold
--   regardless of the final index name. If the real 060/061 target a different
--   grantee set or column set, update the constants in the marked blocks.
-- =====================================================================


-- #####################################################################
-- ## 060 — RPC LOCKDOWN (revoke EXECUTE on SECURITY DEFINER RPCs)     ##
-- #####################################################################

-- ---------------------------------------------------------------------
-- 060 PRE-RUN SAFETY CHECK
-- Purpose: confirm the target functions exist (so the REVOKE has a target),
-- confirm they are SECURITY DEFINER (that is WHY they need lockdown), and
-- SHOW who can currently EXECUTE them so the diff after lockdown is visible.
-- HARD STOP if a targeted function is missing (a REVOKE on a missing function
-- errors; and its absence means the app's ledger path is already broken).
-- ---------------------------------------------------------------------

-- 060.PRE (informational): current EXECUTE grants on the target RPCs.
SELECT p.proname                                   AS function_name,
       pg_get_function_identity_arguments(p.oid)   AS args,
       p.prosecdef                                 AS is_security_definer,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_can_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_exec,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('post_journal_entry', 'cpa_token_bump_usage')
ORDER BY p.proname;

-- 060.PRE (hard gate): both target functions must exist and be SECURITY DEFINER.
DO $$
DECLARE
  _expected TEXT[] := ARRAY['post_journal_entry', 'cpa_token_bump_usage'];
  _name TEXT;
  _n INT;
  _secdef BOOLEAN;
BEGIN
  FOREACH _name IN ARRAY _expected LOOP
    SELECT count(*) INTO _n
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.proname = _name;
    IF _n = 0 THEN
      RAISE EXCEPTION '060 PRE FAIL: SECURITY DEFINER RPC %() not found in schema public — lockdown target missing (ledger path likely broken)', _name;
    END IF;
    -- every overload must be SECURITY DEFINER (these RPCs bypass RLS by design)
    FOR _secdef IN
      SELECT p.prosecdef FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
       WHERE ns.nspname = 'public' AND p.proname = _name
    LOOP
      IF NOT _secdef THEN
        RAISE EXCEPTION '060 PRE WARN->FAIL: %() is NOT SECURITY DEFINER — verify this is the intended lockdown target before revoking', _name;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE '060 PRE OK: both SECURITY DEFINER RPCs present. Safe to apply lockdown.';
END $$;

-- ---------------------------------------------------------------------
-- 060 POST-RUN ASSERTION
-- Purpose: anon + authenticated + PUBLIC must NOT be able to EXECUTE the RPCs;
-- service_role MUST retain EXECUTE (else the app's ledger writes break).
-- NOTE: has_function_privilege('anon', ...) returns TRUE if EXECUTE was granted
-- to PUBLIC (anon inherits PUBLIC), so asserting anon=false ALSO proves PUBLIC
-- was revoked. No separate PUBLIC probe needed.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  _targets TEXT[] := ARRAY['post_journal_entry', 'cpa_token_bump_usage'];
  _name TEXT;
  _oid OID;
  _role TEXT;
  _locked_roles TEXT[] := ARRAY['anon', 'authenticated'];
BEGIN
  -- roles must exist (Supabase provides anon/authenticated/service_role)
  FOREACH _role IN ARRAY (_locked_roles || ARRAY['service_role']) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = _role) THEN
      RAISE EXCEPTION '060 POST FAIL: role % does not exist — not a Supabase-shaped DB, cannot verify lockdown', _role;
    END IF;
  END LOOP;

  FOREACH _name IN ARRAY _targets LOOP
    FOR _oid IN
      SELECT p.oid FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
       WHERE ns.nspname = 'public' AND p.proname = _name
    LOOP
      -- every locked-out role must be denied on every overload
      FOREACH _role IN ARRAY _locked_roles LOOP
        IF has_function_privilege(_role, _oid, 'EXECUTE') THEN
          RAISE EXCEPTION '060 POST FAIL: % can still EXECUTE %() [oid %] — lockdown not applied (or PUBLIC grant survives)', _role, _name, _oid;
        END IF;
      END LOOP;
      -- service_role must keep EXECUTE so supabaseAdmin still works
      IF NOT has_function_privilege('service_role', _oid, 'EXECUTE') THEN
        RAISE EXCEPTION '060 POST FAIL: service_role LOST EXECUTE on %() [oid %] — app ledger writes would break; re-grant to service_role', _name, _oid;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE '060 POST OK: anon+authenticated (and PUBLIC) revoked; service_role retains EXECUTE on both RPCs.';
END $$;


-- #####################################################################
-- ## 061 — JOURNAL DEDUP UNIQUE INDEX                                 ##
-- ##   Intended: UNIQUE (tenant_id, source, source_id)               ##
-- ##            WHERE source_id IS NOT NULL   (partial)              ##
-- #####################################################################

-- ---------------------------------------------------------------------
-- 061 PRE-RUN SAFETY CHECK — THE REQUIRED DUP-PROBE, RUN THIS FIRST.
-- CREATE UNIQUE INDEX fails on the WHOLE deploy if the table already holds
-- two rows sharing (tenant_id, source, source_id) with source_id NOT NULL.
-- Probe MUST be clean (zero rows) before applying 061.
-- ---------------------------------------------------------------------

-- 061.PRE (dup-probe SELECT — enumerate offending groups; expect ZERO rows):
SELECT tenant_id,
       source,
       source_id,
       count(*)                    AS dup_count,
       array_agg(id ORDER BY created_at) AS entry_ids
FROM journal_entries
WHERE source_id IS NOT NULL
GROUP BY tenant_id, source, source_id
HAVING count(*) > 1
ORDER BY dup_count DESC, tenant_id;

-- 061.PRE (hard gate): RAISE if any duplicate group exists — do NOT apply 061
-- until the rows above are merged/deleted, or CREATE UNIQUE INDEX will error.
DO $$
DECLARE
  _dups BIGINT;
BEGIN
  SELECT count(*) INTO _dups FROM (
    SELECT 1
    FROM journal_entries
    WHERE source_id IS NOT NULL
    GROUP BY tenant_id, source, source_id
    HAVING count(*) > 1
  ) g;

  IF _dups > 0 THEN
    RAISE EXCEPTION '061 PRE FAIL: % duplicate (tenant_id,source,source_id) group(s) with source_id NOT NULL. CREATE UNIQUE INDEX WILL FAIL. Resolve the rows from the dup-probe SELECT first.', _dups;
  END IF;
  RAISE NOTICE '061 PRE OK: no dedup-key collisions. Safe to create the partial unique index.';
END $$;

-- ---------------------------------------------------------------------
-- 061 POST-RUN ASSERTION
-- Purpose: a UNIQUE index on journal_entries must cover exactly the dedup key
-- {tenant_id, source, source_id}. Partial (WHERE source_id IS NOT NULL) is the
-- intended shape and is surfaced informationally.
-- ---------------------------------------------------------------------

-- 061.POST (informational): every unique index on journal_entries + its predicate.
SELECT i.relname AS index_name,
       x.indisunique AS is_unique,
       pg_get_indexdef(x.indexrelid) AS definition
FROM pg_index x
JOIN pg_class i ON i.oid = x.indexrelid
JOIN pg_class t ON t.oid = x.indrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public' AND t.relname = 'journal_entries' AND x.indisunique
ORDER BY i.relname;

-- 061.POST (hard gate): a unique index whose column set == {tenant_id, source, source_id}.
DO $$
DECLARE
  _match_count INT;
BEGIN
  SELECT count(*) INTO _match_count
  FROM pg_index x
  JOIN pg_class t ON t.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public'
    AND t.relname = 'journal_entries'
    AND x.indisunique
    AND (
      SELECT array_agg(a.attname ORDER BY a.attname)
      FROM unnest(x.indkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      WHERE k.attnum <> 0                 -- exclude expression columns
    ) = ARRAY['source','source_id','tenant_id']::name[];  -- sorted set match

  IF _match_count = 0 THEN
    RAISE EXCEPTION '061 POST FAIL: no UNIQUE index on journal_entries over {tenant_id, source, source_id}. Dedup is NOT enforced at the DB level.';
  END IF;
  RAISE NOTICE '061 POST OK: % unique index(es) enforce the (tenant_id, source, source_id) dedup key.', _match_count;
END $$;


-- #####################################################################
-- ## 062 — inbound_emails.tenant_id (scope inbound webhook rows)     ##
-- #####################################################################

-- ---------------------------------------------------------------------
-- 062 PRE-RUN SAFETY CHECK
-- Purpose: the ALTER TABLE ... ADD COLUMN needs inbound_emails to EXIST (its
-- CREATE TABLE was applied out-of-band, not tracked in this repo). Confirm the
-- table is present; report whether the column already exists (062 is idempotent
-- via IF NOT EXISTS) and how many pre-existing rows will be NULL (unscoped) and
-- need the documented manual backfill.
-- ---------------------------------------------------------------------

-- 062.PRE (hard gate): table must exist, tenants(id) FK target must exist.
DO $$
BEGIN
  IF to_regclass('public.inbound_emails') IS NULL THEN
    RAISE EXCEPTION '062 PRE FAIL: table public.inbound_emails does not exist — ALTER TABLE will error. Confirm the out-of-band CREATE TABLE landed first.';
  END IF;
  IF to_regclass('public.tenants') IS NULL THEN
    RAISE EXCEPTION '062 PRE FAIL: table public.tenants missing — the tenant_id FK reference cannot resolve.';
  END IF;
  RAISE NOTICE '062 PRE OK: inbound_emails + tenants present. ADD COLUMN IF NOT EXISTS is safe/idempotent.';
END $$;

-- 062.PRE (informational): does the column already exist, and how many rows are
-- currently unscoped? (Only meaningful if the column already exists; the CASE
-- avoids erroring when it does not.)
SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'inbound_emails' AND column_name = 'tenant_id'
       ) AS tenant_id_column_already_exists;

-- ---------------------------------------------------------------------
-- 062 POST-RUN ASSERTION
-- Purpose: column tenant_id must exist on inbound_emails, be UUID, carry a FK to
-- tenants(id), and the supporting index idx_inbound_emails_tenant must exist.
-- Also surfaces the NULL-tenant (unscoped, pre-backfill) row count as a reminder
-- that the documented manual backfill still needs to run.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  _data_type TEXT;
  _has_fk BOOLEAN;
  _has_index BOOLEAN;
BEGIN
  -- column exists + is uuid
  SELECT data_type INTO _data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'inbound_emails' AND column_name = 'tenant_id';

  IF _data_type IS NULL THEN
    RAISE EXCEPTION '062 POST FAIL: inbound_emails.tenant_id column is absent — migration 062 did not apply.';
  END IF;
  IF _data_type <> 'uuid' THEN
    RAISE EXCEPTION '062 POST FAIL: inbound_emails.tenant_id is % (expected uuid).', _data_type;
  END IF;

  -- FK to tenants(id)
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t   ON t.oid = c.conrelid
    JOIN pg_class rt  ON rt.oid = c.confrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND t.relname = 'inbound_emails'
      AND rt.relname = 'tenants'
      AND a.attname = 'tenant_id'
  ) INTO _has_fk;
  IF NOT _has_fk THEN
    RAISE EXCEPTION '062 POST FAIL: inbound_emails.tenant_id has no FK to tenants(id).';
  END IF;

  -- supporting index (idx_inbound_emails_tenant, or any index leading on tenant_id)
  SELECT EXISTS (
    SELECT 1
    FROM pg_index x
    JOIN pg_class i ON i.oid = x.indexrelid
    JOIN pg_class t ON t.oid = x.indrelid
    WHERE t.relname = 'inbound_emails'
      AND (
        SELECT a.attname
        FROM unnest(x.indkey) WITH ORDINALITY AS k(attnum, ord)
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
        WHERE k.ord = 1
      ) = 'tenant_id'
  ) INTO _has_index;
  IF NOT _has_index THEN
    RAISE EXCEPTION '062 POST FAIL: no index leading on inbound_emails(tenant_id) — idx_inbound_emails_tenant missing.';
  END IF;

  RAISE NOTICE '062 POST OK: inbound_emails.tenant_id is uuid + FK->tenants(id) + indexed.';
END $$;

-- 062.POST (informational): unscoped rows remaining. Non-zero is EXPECTED until
-- the documented manual backfill runs; these rows must NOT surface in any
-- tenant inbox. Zero after backfill.
SELECT count(*) AS unscoped_inbound_emails_remaining
FROM inbound_emails
WHERE tenant_id IS NULL;

-- =====================================================================
-- END OF PACK. Recap of run order:
--   060.PRE  -> apply 060 -> 060.POST
--   061.PRE (dup-probe FIRST) -> apply 061 -> 061.POST
--   062.PRE  -> apply 062 -> 062.POST  -> run documented backfill -> re-check 062.POST unscoped count
-- =====================================================================
