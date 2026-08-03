-- team_applications has photo_url (correctly used by cleaning tenants whose
-- apply form collects an actual photo, rendered as <img> in the Applications
-- tab). Tenants whose form collects a video selfie instead (nyc-mobile-salon:
-- required, min 30s) had nowhere real to put it -- /api/apply only embedded
-- the URL as a line of text inside `notes`, so it was never a queryable/
-- renderable field. Add a real column instead of overloading photo_url with
-- two different media types.

ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS video_url TEXT;
