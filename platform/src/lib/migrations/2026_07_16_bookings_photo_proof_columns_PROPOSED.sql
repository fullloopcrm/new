-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Schema for the photo/proof-of-work gap flagged in
-- deploy-prep/w4-broad-hunt-2026-07-16-1637-referrer-total-earned-race-plus-checkin-photo-gap.md:
-- zero photo capture anywhere in check-in/check-out. bookings already has
-- walkthrough_video_url / final_video_url (single-URL-per-type columns, see
-- src/lib/migrations/013_full_parity.sql), but a single column doesn't fit
-- photo proof — a real job needs several: multiple angles of a dumpster
-- placement, junk-removal before/after pairs, a moving crew's damage-claim
-- documentation. Mirrors the existing multi-image precedent instead:
-- reviews.images jsonb DEFAULT '[]'::jsonb (src/lib/migrations/017_review_submission_fields.sql).
--
-- Each element of the array is expected to be an object shaped like:
--   { "url": text, "uploaded_at": timestamptz-string, "lat": number|null, "lng": number|null }
-- GPS coordinates are included per-photo (not just relying on the existing
-- booking-level check_in_lat/check_in_lng) because a crew's location can
-- drift between check-in and when a specific photo is taken later in a long
-- job — the whole point of "proof of work" is tying the photo to where and
-- when it was actually captured.
--
-- This is a GLOBAL-architecture feature per platform/CLAUDE.md (one shared
-- column pair, all tenants, gated by nothing archetype-specific) — every
-- tenant gets the capability; archetypes that don't use it simply have an
-- empty array, same as walkthrough/final video today.
--
-- NOT wired into any route yet: paired with
-- src/app/api/team-portal/photo-upload/route.ts (also file-only, not
-- deployed/linked from any UI this pass). Apply this migration before that
-- route is wired into the team-portal UI, same ordering as every other
-- claim-column migration this session.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkin_photos jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checkout_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Atomic append, same reasoning as referrer_bump_total_earned in this same
-- batch: a plain `.update({ checkin_photos: [...existing, newPhoto] })` from
-- the route is a read-then-write, and a crew member selecting several
-- photos at once uploads them in parallel — concurrent appends to the same
-- booking would otherwise race and silently drop a photo. Two separate
-- functions (not one parameterized by column name) to avoid any dynamic-SQL
-- identifier handling for a two-column, unlikely-to-grow case.
CREATE OR REPLACE FUNCTION booking_append_checkin_photo(p_booking_id UUID, p_photo JSONB) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE bookings
  SET checkin_photos = checkin_photos || jsonb_build_array(p_photo)
  WHERE id = p_booking_id;
$$;

CREATE OR REPLACE FUNCTION booking_append_checkout_photo(p_booking_id UUID, p_photo JSONB) RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  UPDATE bookings
  SET checkout_photos = checkout_photos || jsonb_build_array(p_photo)
  WHERE id = p_booking_id;
$$;

GRANT EXECUTE ON FUNCTION booking_append_checkin_photo(UUID, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION booking_append_checkout_photo(UUID, JSONB) TO authenticated, service_role;
