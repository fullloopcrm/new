-- TOCTOU fix: client login/signup (src/app/api/client/verify-code/route.ts)
-- looks up an existing client by (tenant_id, email) via SELECT, then INSERTs
-- a new client row if none is found — with no unique constraint backing
-- that decision. A double-tap on "verify" (or any concurrent retry) can
-- race two requests past the SELECT before either INSERT lands, creating
-- two client rows for one signup (TOCTOU audit finding, 2026-07-13 —
-- deploy-prep/toctou-audit-p1-w3.md, "Flagged — real gap, not fixed" #1).
--
-- PRE-REQUISITE — dedupe first. `clients` is not in the tracked migration
-- history (created out-of-band), so whether duplicate (tenant_id, email)
-- rows already exist today is unknown. Before this index can be created:
--
--   npx tsx scripts/dedupe-clients-email.mjs
--
-- (report mode, read-only, safe to run anytime SUPABASE_ACCESS_TOKEN_FULLLOOP
-- is set). If it reports existing duplicate groups, resolve them first — see
-- that script's header for the merge strategy (keep the OLDEST row per
-- group, matching verify-code.ts's own existing tie-break of
-- `.order('created_at', {ascending:true}).limit(1)`, reassign every
-- FK-referencing table's rows from the newer duplicate(s) to that winner,
-- then delete the losers) and its `--apply` mode. That mode is authored but
-- has NOT been run against prod — it needs Jeff/leader sign-off first, same
-- as this migration.
--
-- The DO block below is a friendlier guard than the bare Postgres
-- duplicate-key error CREATE UNIQUE INDEX would throw on its own: it names
-- how many offending groups exist so whoever runs this migration knows to
-- go dedupe instead of parsing a raw index-creation failure.
DO $$
DECLARE
  dupe_count integer;
BEGIN
  SELECT count(*) INTO dupe_count FROM (
    SELECT tenant_id, lower(email) AS email_lc
    FROM clients
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY tenant_id, lower(email)
    HAVING count(*) > 1
  ) dupes;

  IF dupe_count > 0 THEN
    RAISE EXCEPTION
      'clients has % duplicate (tenant_id, email) group(s) — run scripts/dedupe-clients-email.mjs (report mode) to see them, resolve with --apply, then re-run this migration',
      dupe_count;
  END IF;
END $$;

-- Case-insensitive to match the app's own lowercasing convention (every
-- insert/update path in verify-code.ts lowercases email before writing, and
-- the existing lookup uses .ilike()).
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_tenant_email_unique
  ON clients (tenant_id, lower(email))
  WHERE email IS NOT NULL AND email <> '';
