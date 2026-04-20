-- 014_security_hardening.sql
-- Cutover-blocker security items from AUDIT.md.
-- Apply via: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/014_security_hardening.sql
-- Safe to re-run (uses IF NOT EXISTS / guarded blocks).

BEGIN;

-- ============================================================================
-- 1. Persistent rate limiter (survives serverless cold start).
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_key text NOT NULL,        -- e.g. "portal:+15551234567" or "admin:ip:1.2.3.4"
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_bucket_time
  ON rate_limit_events(bucket_key, happened_at DESC);

-- Autovacuum helper: delete rows older than 2 hours. Run via cron or a periodic sweep.
-- DELETE FROM rate_limit_events WHERE happened_at < now() - interval '2 hours';


-- ============================================================================
-- 2. Booking overlap prevention — DB-level exclusion constraint.
--    Blocks two active bookings on the same team_member whose time windows overlap.
-- ============================================================================
-- btree_gist provides GiST indexes over btree types (uuid) needed for composite exclusion.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_no_overlap_per_team_member'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_no_overlap_per_team_member
      EXCLUDE USING gist (
        team_member_id WITH =,
        tenant_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      )
      WHERE (
        team_member_id IS NOT NULL
        AND start_time IS NOT NULL
        AND end_time IS NOT NULL
        AND status NOT IN ('cancelled', 'no_show')
      );
  END IF;
END$$;


-- ============================================================================
-- 3. Team-member PIN uniqueness (per tenant).
--    Prevents two active team_members sharing the same PIN on a tenant.
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_tenant_pin_unique
  ON team_members(tenant_id, pin)
  WHERE pin IS NOT NULL AND status = 'active';


-- ============================================================================
-- 4. pgcrypto — required for Google OAuth refresh token encryption.
--    (Actual column migration deferred; enabling the extension is free.)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================================
-- 5. OAuth state verification — store nonce to validate callback.
-- ============================================================================
CREATE TABLE IF NOT EXISTS oauth_state_nonces (
  nonce text PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_oauth_state_nonces_tenant
  ON oauth_state_nonces(tenant_id, created_at DESC);

COMMIT;

-- Verification queries (run after apply):
-- SELECT conname FROM pg_constraint WHERE conname = 'bookings_no_overlap_per_team_member';
-- SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_team_members_tenant_pin_unique','idx_rate_limit_bucket_time');
-- SELECT extname FROM pg_extension WHERE extname IN ('btree_gist','pgcrypto');
