-- 060_lockdown_secdef_rpcs.sql
-- P1 schema lane (W1). Hardens the two SECURITY DEFINER RPCs created in
-- migration 039 (post_journal_entry, cpa_token_bump_usage). File only — the
-- leader runs this against prod after Jeff's approval. No DB command was run
-- to author it.
--
-- ── WHY THIS FILE EXISTS: cross-tenant forgery risk ───────────────────────
-- Both functions are SECURITY DEFINER, so they execute with the OWNER's
-- privileges and BYPASS row-level security. Migration 039 granted EXECUTE on
-- both to `authenticated`. That means any logged-in end user (via the anon/
-- authenticated Supabase client) can call them directly — RLS never runs.
--
--   • post_journal_entry(p_tenant_id, ...) takes tenant_id as a PLAIN ARGUMENT
--     and inserts journal_entries / journal_lines for whatever tenant_id the
--     caller passes. An authenticated user of tenant A can therefore forge
--     balanced ledger entries into tenant B's books — cross-tenant financial
--     data forgery with no authorization check inside the function.
--   • cpa_token_bump_usage(p_token) updates cpa_access_tokens for ANY token
--     value supplied, letting an authenticated caller mutate usage counters /
--     last_used_at on tokens that are not theirs.
--
-- These RPCs are only ever meant to be invoked server-side through the service
-- role (supabaseAdmin), where the tenant is resolved and authorized BEFORE the
-- call. Nothing legitimate calls them from a browser-side authenticated client.
--
-- This migration:
--   1. REVOKEs EXECUTE from `authenticated` (and PUBLIC, defense-in-depth) on
--      both functions, keeping EXECUTE for `service_role` only.
--   2. Pins search_path on both so the SECURITY DEFINER bodies can't be
--      hijacked by a caller-controlled search_path pointing at a malicious
--      same-named table/function. Both bodies use UNQUALIFIED object names, so
--      the path is pinned to `public, pg_temp` (NOT '', which would break the
--      unqualified references) — pg_temp last so a temp object can't shadow.
--
-- Idempotent: REVOKE of an absent grant is a no-op, GRANT is repeatable, and
-- ALTER FUNCTION ... SET search_path is repeatable. Safe to re-run.

-- ── post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) ────
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) TO service_role;
ALTER  FUNCTION post_journal_entry(UUID, UUID, DATE, TEXT, TEXT, UUID, UUID, JSONB) SET search_path = public, pg_temp;

-- ── cpa_token_bump_usage(TEXT) ────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION cpa_token_bump_usage(TEXT) TO service_role;
ALTER  FUNCTION cpa_token_bump_usage(TEXT) SET search_path = public, pg_temp;
