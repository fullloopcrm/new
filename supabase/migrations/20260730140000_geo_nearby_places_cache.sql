-- Persistent cache for the Overpass "nearby places" geo fallback (2026-07-30)
--
-- src/lib/geo/nearby-places.ts (Phase 2 geo nationalization) originally
-- cached Overpass API responses in a module-level in-memory Map, keyed by
-- rounded lat/lng/radius, for 24h. That cache is invoked from
-- resolveCoverage() -> activateTenant(), which only ever runs inside a
-- Next.js API route (`src/app/api/admin/businesses/[id]/activate/route.ts`,
-- `export const runtime = 'nodejs'`) — a Vercel serverless function, not a
-- long-running process. Serverless containers are recycled on cold start and
-- are never guaranteed to be reused between invocations, so a module-level
-- Map is wiped far more often than every 24h in production — the TTL was
-- real in a local dev server but effectively non-functional on Vercel. This
-- matters because Overpass's public instance is real, shared, rate-limited
-- infrastructure (verified live: a `rate_limited` response was hit during
-- testing after only two requests in quick succession) — every cold start
-- re-querying Overpass instead of hitting a warm cache defeats the point of
-- caching at all.
--
-- This table is the real persistence layer; the in-memory Map stays as a
-- same-invocation fast path (harmless, occasionally saves a DB round trip
-- within one warm container) but is no longer load-bearing for the TTL.
--
-- Not tenant-scoped: the cache key is the geocoded center + radius, and the
-- same physical location returns the same real-world nearby places
-- regardless of which tenant asked — scoping this by tenant_id would just
-- mean every tenant near the same address re-pays the same Overpass call.
--
-- Idempotent: every statement is IF NOT EXISTS / safe to re-run. No
-- destructive ops. GATED — author only, do not apply without Jeff's
-- explicit go per THE PROCEDURE in platform/docs/runbooks/migration-runbook.md.

-- ─── PRE (informational — confirm nothing here already exists) ─────────
DO $$
BEGIN
  RAISE NOTICE 'PRE geo_nearby_places_cache: table exists=%',
    (SELECT to_regclass('public.geo_nearby_places_cache') IS NOT NULL);
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS geo_nearby_places_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Same key shape as the in-memory cache: `${lat.toFixed(2)},${lng.toFixed(2)},${radiusMiles}`.
  cache_key TEXT NOT NULL UNIQUE,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  radius_miles NUMERIC NOT NULL,
  -- NearbyPlace[] (name/state/lat/lng/distanceMiles/population), same shape
  -- nearby-places.ts already returns — stored as-is, no reshaping on read.
  places JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_nearby_places_cache_expires ON geo_nearby_places_cache(expires_at);

CREATE OR REPLACE FUNCTION geo_nearby_places_cache_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_geo_nearby_places_cache_updated_at ON geo_nearby_places_cache;
CREATE TRIGGER trg_geo_nearby_places_cache_updated_at BEFORE UPDATE ON geo_nearby_places_cache
  FOR EACH ROW EXECUTE FUNCTION geo_nearby_places_cache_updated_at();

-- RLS enabled, no policies — matches tenant_locations/tenant_notes
-- (2026_07_30_tenant_profile_gaps): default-deny for anon/authenticated,
-- reachable only via supabaseAdmin (service_role, bypasses RLS), same as
-- every other server-only cache/internal table in this schema.
ALTER TABLE geo_nearby_places_cache ENABLE ROW LEVEL SECURITY;

-- ─── POST (assertion — must emit "POST OK", never raise) ────────────────
DO $$
BEGIN
  IF to_regclass('public.geo_nearby_places_cache') IS NULL THEN
    RAISE EXCEPTION 'POST FAILED: geo_nearby_places_cache table missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'geo_nearby_places_cache' AND indexname = 'idx_geo_nearby_places_cache_expires'
  ) THEN
    RAISE EXCEPTION 'POST FAILED: idx_geo_nearby_places_cache_expires missing';
  END IF;
  RAISE NOTICE 'geo_nearby_places_cache POST OK';
END $$;

-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   DROP TABLE IF EXISTS geo_nearby_places_cache;
