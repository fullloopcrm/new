-- nycmaid parity: ratings, client_reviews, booking_team_members, plus bookings/team_members aggregates
-- Adapted from nycmaid's migrations/2026_04_27_ratings.sql + 2026_04_29_team_bookings.sql
-- cleaner_id → team_member_id (fullloop convention)
-- Added tenant_id to every row for multi-tenancy

-- ── ratings ──
CREATE TABLE IF NOT EXISTS public.ratings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id      uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  team_member_id  uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  service_rating  smallint CHECK (service_rating BETWEEN 1 AND 5),
  cleaner_rating  smallint CHECK (cleaner_rating BETWEEN 1 AND 5),
  feedback        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_tenant ON public.ratings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ratings_team_member ON public.ratings(team_member_id);
CREATE INDEX IF NOT EXISTS idx_ratings_client ON public.ratings(client_id);

-- ── client_reviews (review credits owed for 5-star reviews) ──
CREATE TABLE IF NOT EXISTS public.client_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  booking_id      uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  team_member_id  uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  type            text NOT NULL CHECK (type IN ('text', 'video', 'google')),
  credit_amount   integer NOT NULL,
  proof_url       text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'paid')),
  paid_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reviews_tenant ON public.client_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_status ON public.client_reviews(tenant_id, status);

-- ── bookings: add payment + rating timestamps ──
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_received_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS rating_prompt_sent_at timestamptz;

-- ── bookings: team_size for multi-tech jobs ──
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS team_size int NOT NULL DEFAULT 1;

-- ── team_members: rating aggregates ──
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS avg_rating numeric(3,2);
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

-- ── refresh team_member aggregate when rating changes ──
CREATE OR REPLACE FUNCTION public.refresh_team_member_rating() RETURNS trigger AS $$
BEGIN
  UPDATE public.team_members tm
  SET avg_rating = (
    SELECT round(avg(cleaner_rating)::numeric, 2)
    FROM public.ratings WHERE team_member_id = tm.id AND cleaner_rating IS NOT NULL
  ),
  rating_count = (
    SELECT count(*) FROM public.ratings WHERE team_member_id = tm.id AND cleaner_rating IS NOT NULL
  )
  WHERE tm.id = COALESCE(NEW.team_member_id, OLD.team_member_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_refresh_team_member_rating ON public.ratings;
CREATE TRIGGER trg_refresh_team_member_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.refresh_team_member_rating();

-- ── booking_team_members (multi-tech junction) ──
CREATE TABLE IF NOT EXISTS public.booking_team_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id      uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  team_member_id  uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  is_lead         boolean NOT NULL DEFAULT false,
  position        int NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_btm_tenant ON public.booking_team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_btm_booking ON public.booking_team_members(booking_id);
CREATE INDEX IF NOT EXISTS idx_btm_team_member ON public.booking_team_members(team_member_id);

-- Backfill: existing solo bookings become single-tech teams
INSERT INTO public.booking_team_members (tenant_id, booking_id, team_member_id, is_lead, position)
SELECT tenant_id, id, team_member_id, true, 1
FROM public.bookings
WHERE team_member_id IS NOT NULL
ON CONFLICT (booking_id, team_member_id) DO NOTHING;

ALTER TABLE public.booking_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
