-- job_photos.shareable (2026-07-27)
-- Per-photo consent gate for social auto-post (src/lib/social.ts
-- pickAutoPostPhoto). A photo is only eligible for auto-posting once
-- whoever captured it explicitly marks it OK to share publicly -- the
-- tenant-level "Auto-post on job completion" toggle alone is not enough
-- consent for a specific photo to go on a public feed. Additive, safe on
-- live prod; existing rows default to false (not shareable).
ALTER TABLE job_photos ADD COLUMN IF NOT EXISTS shareable BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_job_photos_shareable ON job_photos(booking_id, photo_type) WHERE shareable = true;
