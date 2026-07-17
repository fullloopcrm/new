-- 2026_07_17_rate_limit_check_and_record_atomic_PROPOSED.sql
--
-- Closes a TOCTOU race in rateLimitDb() (src/lib/rate-limit-db.ts) — the
-- shared, persistent brute-force throttle behind EVERY auth-critical
-- endpoint in the platform: admin login, client login, team-portal login,
-- portal OTP request/verify, referrer OTP request/verify, PIN reset. All of
-- these call rateLimitDb(..., { failClosed: true }) expecting it to actually
-- cap attempts at maxRequests (typically 5) per window.
--
-- THE RACE: the current implementation is a plain two-step
-- count-then-insert — `SELECT count(*) ... WHERE bucket_key=$1 AND
-- happened_at >= $since` followed by a separate `INSERT INTO
-- rate_limit_events`, no locking between them. Under concurrent requests to
-- the same bucket_key (e.g. an attacker firing N parallel OTP-verify or
-- admin-login guesses instead of sequential ones), every one of the N
-- concurrent calls can run its count() BEFORE any of the others' insert()
-- has committed — each sees the same pre-race count, each is allowed, each
-- inserts. The intended "5 attempts per 15 min" throttle on a 4-8 digit
-- PIN/OTP becomes N-attempts-per-burst, with N bounded only by how many
-- concurrent requests the attacker can fire — a real brute-force
-- amplification vector on every login/OTP/PIN surface in the platform, not
-- a theoretical one (each of those call sites already flagged their own
-- rate limit as the intended defense against exactly this).
--
-- THE FIX: same pattern as
-- 2026_07_16_booking_overlap_trigger_advisory_lock_PROPOSED.sql — a
-- transaction-scoped advisory lock keyed on the bucket_key, taken before the
-- count, so concurrent calls for the SAME bucket_key serialize (calls for
-- different bucket_keys never contend). The second caller's count is
-- guaranteed to see the first caller's now-committed insert (or find the
-- first rolled back), closing the window entirely — count and insert become
-- one atomic check-and-record instead of two independent round trips.
--
-- ROLLOUT SAFETY: src/lib/rate-limit-db.ts is updated in the same PR to call
-- this RPC first and fall back to the existing (racy but functional) two-step
-- logic only if the RPC itself is missing (Postgres "function does not
-- exist" error) — so the code change is safe to ship BEFORE this migration
-- runs (no outage window), and self-upgrades to atomic the moment this
-- migration is applied. Do not skip applying this migration after deploy —
-- the fallback path is a compatibility shim, not the fix.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_17_rate_limit_check_and_record_atomic_PROPOSED.sql

BEGIN;

CREATE OR REPLACE FUNCTION rate_limit_check_and_record(
  p_bucket_key TEXT,
  p_max_requests INT,
  p_window_ms BIGINT
) RETURNS TABLE(allowed BOOLEAN, remaining INT)
LANGUAGE plpgsql
AS $$
DECLARE
  _since TIMESTAMPTZ;
  _current INT;
BEGIN
  -- Serialize concurrent check-and-record calls for this bucket_key only.
  -- Auto-released at COMMIT/ROLLBACK of this statement's implicit transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_bucket_key, 0));

  _since := now() - (p_window_ms || ' milliseconds')::interval;

  SELECT count(*) INTO _current
  FROM rate_limit_events
  WHERE bucket_key = p_bucket_key
    AND happened_at >= _since;

  IF _current >= p_max_requests THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  INSERT INTO rate_limit_events (bucket_key) VALUES (p_bucket_key);

  RETURN QUERY SELECT TRUE, GREATEST(p_max_requests - _current - 1, 0);
END;
$$;

-- service_role only (supabaseAdmin) — this is an internal throttle primitive,
-- not something an authenticated tenant/client session should ever call
-- directly (a caller with arbitrary bucket_key access could otherwise
-- pre-fill or read another actor's rate-limit bucket).
GRANT EXECUTE ON FUNCTION rate_limit_check_and_record(TEXT, INT, BIGINT) TO service_role;
REVOKE EXECUTE ON FUNCTION rate_limit_check_and_record(TEXT, INT, BIGINT) FROM PUBLIC, authenticated;

COMMIT;

-- Verify:
-- SELECT prosrc FROM pg_proc WHERE proname = 'rate_limit_check_and_record';
--   (confirm pg_advisory_xact_lock appears in the function body)
--
-- Manual race repro (run concurrently in two psql sessions):
--   Session A: BEGIN; SELECT rate_limit_check_and_record('test:race', 5, 900000); -- hold, don't commit
--   Session B: SELECT rate_limit_check_and_record('test:race', 5, 900000);
--   Before this fix (old count-then-insert path): both sessions' count()
--   queries can run before either insert lands, so both can be allowed even
--   past max_requests.
--   After this fix: B blocks on the advisory lock until A commits/rolls
--   back, then B's count correctly reflects A's now-committed insert (if A
--   committed) or A's absence (if A rolled back).
