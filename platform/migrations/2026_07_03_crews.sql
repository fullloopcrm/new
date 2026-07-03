-- Crews (2026-07-03)
-- A crew is a named, reusable group of team members (e.g. "Remodel Team A").
-- Sessions/bookings can be assigned a whole crew, not just one member — needed
-- for projects that run a team over months. A booking may carry a crew_id AND/OR
-- a single team_member_id (lead). Idempotent.
CREATE TABLE IF NOT EXISTS public.crews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  color text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crews_tenant ON public.crews(tenant_id);

CREATE TABLE IF NOT EXISTS public.crew_members (
  crew_id uuid NOT NULL REFERENCES public.crews(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  PRIMARY KEY (crew_id, team_member_id)
);

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS crew_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_crew_id_fkey') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_crew_id_fkey FOREIGN KEY (crew_id) REFERENCES public.crews(id) ON DELETE SET NULL;
  END IF;
END $$;
