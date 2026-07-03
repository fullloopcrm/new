-- Booking assignees (2026-07-03)
-- A session/booking can be worked by single, multiple ad-hoc, or a whole crew of
-- members. This join holds the full assignee set; bookings.team_member_id keeps
-- the lead and bookings.crew_id the saved crew (if one was used). Idempotent.
CREATE TABLE IF NOT EXISTS public.booking_assignees (
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  team_member_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, team_member_id)
);
CREATE INDEX IF NOT EXISTS idx_booking_assignees_member ON public.booking_assignees(team_member_id);
