-- 017_review_submission_fields.sql
-- Extend reviews table to support PUBLIC, unsolicited client submissions from
-- tenant sites. Existing review-request flow (admin asking client for a review
-- after a booking) already works; this migration adds fields for self-submitted
-- reviews that come in via /api/reviews/submit.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/017_review_submission_fields.sql

BEGIN;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS text text,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS team_member_name text,
  ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

COMMIT;
