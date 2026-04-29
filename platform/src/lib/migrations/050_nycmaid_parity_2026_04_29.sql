-- 050_nycmaid_parity_2026_04_29.sql
--
-- Catches fullloop up to nycmaid changes shipped 2026-04-27 → 04-29.
-- Tenant-aware port. Every new table gets RLS deny-all (service-role only,
-- matching migration 046's pattern).
--
-- Items:
--   1. Multi-tech ("team") bookings — bookings.team_size + booking_team_members
--      table with backfill from current single-tech assignments.
--   2. Preferred tech per client — clients.preferred_team_member_id (+200 in
--      smart-schedule scoring, strongest signal).
--   3. Booking-level controls — is_emergency, max_hours, client_confirm_token
--      (+ terms_accepted_at), payment_received_at, rating_prompt_sent_at,
--      estimated_hours (STORED GENERATED).
--   4. Per-job ratings — `ratings` table with cleaner-aggregate refresh trigger
--      writing back to team_members.avg_rating / rating_count. Plus
--      `client_reviews` table for tracking review-credit redemption.
--   5. Travel-time cache — tenant-scoped cache so smart-schedule doesn't
--      recompute geocoded transit estimates on every call.
--   6. Marketing opt-out audit log — proof of when + how a client opted out
--      (CAN-SPAM / TCPA evidence). Per-channel opt-out columns already exist
--      from migration 013.
--
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 \
--        -U postgres -d postgres -f src/lib/migrations/050_nycmaid_parity_2026_04_29.sql

BEGIN;

-- ============================================================
-- 1. MULTI-TECH BOOKINGS
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_size INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS booking_team_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  team_member_id  uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  is_lead         boolean NOT NULL DEFAULT false,
  position        int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_team_members_booking ON booking_team_members(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_team_members_member  ON booking_team_members(team_member_id);
CREATE INDEX IF NOT EXISTS idx_booking_team_members_tenant  ON booking_team_members(tenant_id);

ALTER TABLE booking_team_members ENABLE ROW LEVEL SECURITY;

-- Backfill: every existing booking with a team_member_id becomes a 1-person
-- team with that member as the lead. Idempotent via UNIQUE constraint.
INSERT INTO booking_team_members (tenant_id, booking_id, team_member_id, is_lead, position)
SELECT tenant_id, id, team_member_id, true, 1
FROM bookings
WHERE team_member_id IS NOT NULL
ON CONFLICT (booking_id, team_member_id) DO NOTHING;

-- ============================================================
-- 2. PREFERRED TEAM MEMBER PER CLIENT
-- ============================================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS preferred_team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_preferred_team_member
  ON clients(preferred_team_member_id)
  WHERE preferred_team_member_id IS NOT NULL;

-- ============================================================
-- 3. BOOKING-LEVEL CONTROLS
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_emergency             boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS max_hours                numeric;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_confirm_token     text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_terms_accepted_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_received_at      timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating_prompt_sent_at    timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_confirm_token
  ON bookings(client_confirm_token)
  WHERE client_confirm_token IS NOT NULL;

-- estimated_hours: derived view of (end_time - start_time) hours. STORED so a
-- future trigger / view / tool can SELECT it without recomputing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE public.bookings
      ADD COLUMN estimated_hours numeric
      GENERATED ALWAYS AS (
        CASE
          WHEN start_time IS NULL OR end_time IS NULL THEN NULL
          ELSE EXTRACT(EPOCH FROM (end_time - start_time)) / 3600.0
        END
      ) STORED;
  END IF;
END $$;

-- ============================================================
-- 4. PER-JOB RATINGS + REVIEW CREDITS
-- ============================================================
CREATE TABLE IF NOT EXISTS ratings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id      uuid REFERENCES bookings(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  team_member_id  uuid REFERENCES team_members(id) ON DELETE SET NULL,
  service_rating  smallint CHECK (service_rating BETWEEN 1 AND 5),
  member_rating   smallint CHECK (member_rating BETWEEN 1 AND 5),
  feedback        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_tenant_member ON ratings(tenant_id, team_member_id);
CREATE INDEX IF NOT EXISTS idx_ratings_tenant_client ON ratings(tenant_id, client_id);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS client_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  booking_id      uuid REFERENCES bookings(id) ON DELETE SET NULL,
  team_member_id  uuid REFERENCES team_members(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN ('text', 'video', 'google')),
  credit_amount   integer NOT NULL,
  proof_url       text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'paid')),
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reviews_tenant_status ON client_reviews(tenant_id, status);

ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Rolling per-tech rating aggregates.
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS avg_rating    numeric(3,2);
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS rating_count  integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION refresh_team_member_rating() RETURNS trigger AS $$
BEGIN
  UPDATE team_members tm
  SET avg_rating = (
    SELECT round(avg(member_rating)::numeric, 2)
    FROM ratings
    WHERE team_member_id = tm.id AND member_rating IS NOT NULL
  ),
  rating_count = (
    SELECT count(*)
    FROM ratings
    WHERE team_member_id = tm.id AND member_rating IS NOT NULL
  )
  WHERE tm.id = COALESCE(NEW.team_member_id, OLD.team_member_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_team_member_rating ON ratings;
CREATE TRIGGER trg_refresh_team_member_rating
  AFTER INSERT OR UPDATE OR DELETE ON ratings
  FOR EACH ROW EXECUTE FUNCTION refresh_team_member_rating();

-- ============================================================
-- 5. TRAVEL-TIME CACHE
-- ============================================================
CREATE TABLE IF NOT EXISTS travel_time_cache (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid REFERENCES tenants(id) ON DELETE CASCADE,
  from_address      text NOT NULL,
  to_address        text NOT NULL,
  duration_minutes  integer NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, from_address, to_address)
);

CREATE INDEX IF NOT EXISTS idx_travel_time_cache_tenant ON travel_time_cache(tenant_id);

ALTER TABLE travel_time_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. MARKETING OPT-OUT AUDIT LOG
-- ============================================================
-- Per-channel opt-out columns (clients.email_marketing_opt_out etc.) already
-- exist from migration 013. This is the audit-log table that records the
-- moment + method of every opt-out for legal proof.
CREATE TABLE IF NOT EXISTS marketing_opt_out_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('email', 'sms')),
  method      text NOT NULL CHECK (method IN ('email_link', 'sms_stop', 'admin')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opt_out_log_tenant_client ON marketing_opt_out_log(tenant_id, client_id);

ALTER TABLE marketing_opt_out_log ENABLE ROW LEVEL SECURITY;

COMMIT;

NOTIFY pgrst, 'reload schema';
