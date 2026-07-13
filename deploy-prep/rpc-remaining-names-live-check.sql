-- ============================================================================
-- RPC REMAINING-NAMES LIVE CHECK  (READ-ONLY)
-- ----------------------------------------------------------------------------
-- Purpose: close the last 2 unresolved names from rpc-security-definer-review.md
--          (§4c/§4d/§5b) — `comhub_get_or_create_contact_by_email` and
--          `seo_refresh_rollup`. Both are called via `.rpc(...)` from LIVE
--          production code paths (4 routes + 1 unattended cron job for the
--          first; platform/src/lib/seo/ingest.ts:131 for the second) but have
--          ZERO definition anywhere in either in-repo migrations tree
--          (platform/migrations/, platform/src/lib/migrations/) after a
--          repo-wide grep. This is the only way left to answer: do these
--          functions actually exist server-side, or is every one of those 5
--          call sites erroring on every invocation today?
--
-- DO NOT EXECUTE AS PART OF DEPLOY. This is a FILE ARTIFACT ONLY. It is run
-- MANUALLY by Jeff / the leader against the DB after review — never by a
-- worker, never automatically. It performs ZERO writes (SELECT against
-- pg_catalog/information_schema only; no DDL, no DML).
--
-- HOW TO RUN:
--   PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres \
--     -d postgres -f deploy-prep/rpc-remaining-names-live-check.sql
--
-- HOW TO READ THE RESULT:
--   * 0 rows returned  => the function does NOT exist server-side. All 5 live
--     call sites (see rpc-security-definer-review.md §5b for the exact file:line
--     list) are currently throwing "function does not exist" on every
--     invocation, including the unattended comhub-email cron job. This is a
--     present-tense reliability bug, not a hypothetical — escalate immediately.
--   * 1-2 rows returned => the function(s) exist. Check `prosecdef`: `t` means
--     SECURITY DEFINER (higher-privilege risk, same class as the 2 already-
--     found `post_journal_entry`/`cpa_token_bump_usage` — would need the same
--     060-style lockdown review); `f` means SECURITY INVOKER (lower risk,
--     matches the other 4 previously-unaudited names resolved in §4a). Check
--     `execute_grantees`: if it includes `anon` or `authenticated`, that's a
--     direct client-callable grant worth a second look regardless of
--     prosecdef.
--   * If found, the function was created outside both repo migrations trees
--     (e.g. directly in the Supabase SQL editor / dashboard) — recommend
--     back-filling its definition into whichever migrations tree is
--     confirmed live (see the unresolved "two parallel migrations trees"
--     process gap in rpc-security-definer-review.md §4c item 2 — resolve
--     that question first if unsure which tree to backfill into).
--
-- Wrap in a read-only transaction when executing manually:
--     BEGIN; SET TRANSACTION READ ONLY;  -- then run the SELECT below
--     COMMIT;  -- (or ROLLBACK; either is fine, nothing was written)
-- ============================================================================

SELECT
  n.nspname                                        AS schema,
  p.proname                                        AS function_name,
  p.prosecdef                                       AS is_security_definer,
  pg_get_function_identity_arguments(p.oid)         AS args,
  (
    SELECT array_agg(DISTINCT grantee::text)
    FROM information_schema.role_routine_grants
    WHERE routine_name = p.proname
      AND privilege_type = 'EXECUTE'
  )                                                  AS execute_grantees
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('comhub_get_or_create_contact_by_email', 'seo_refresh_rollup')
ORDER BY p.proname;
