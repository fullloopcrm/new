-- Extends booking_notes to (1) support LoopCam video sessions (recording +
-- transcript + AI overview) as a note type, and (2) anchor on job_id as an
-- alternative to booking_id so project-level notes aren't forced onto a
-- single booking. Per Jeff's 2026-07-19 decision, this REPLACES both the
-- single-slot bookings.walkthrough_video_url/final_video_url field and the
-- unmerged feat/job-photos-loopcam branch's job_photos table — do not
-- resurrect either as a second write path once this lands.

ALTER TABLE booking_notes ALTER COLUMN booking_id DROP NOT NULL;

ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE CASCADE;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS note_type TEXT NOT NULL DEFAULT 'text'
  CHECK (note_type IN ('text', 'video'));
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;
-- Crew members @-tagged in a note's content, resolved client-side to ids on send.
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS mentioned_team_member_ids UUID[] NOT NULL DEFAULT '{}';

-- Video session fields — null for note_type='text'.
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS video_session_type TEXT DEFAULT 'walkthrough'
  CHECK (video_session_type IN ('walkthrough', 'before', 'during', 'after', 'issue-flag'));
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS video_storage_path TEXT;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS video_duration_seconds INT;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS transcript_json JSONB;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS ai_overview_json JSONB;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS processing_status TEXT
  CHECK (processing_status IN ('uploading', 'uploaded', 'transcribing', 'summarizing', 'complete', 'failed'));
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS processing_failure_reason TEXT;
ALTER TABLE booking_notes ADD COLUMN IF NOT EXISTS processing_attempts INT NOT NULL DEFAULT 0;

-- booking_id was the only anchor before; now either booking_id or job_id must be set
-- (mirrors job_media_sessions_anchor_required in the (superseded) media-sessions spec).
ALTER TABLE booking_notes DROP CONSTRAINT IF EXISTS booking_notes_anchor_required;
ALTER TABLE booking_notes ADD CONSTRAINT booking_notes_anchor_required
  CHECK (booking_id IS NOT NULL OR job_id IS NOT NULL);

-- Original content_or_images check didn't account for video notes, which carry
-- neither content nor images at creation time (both arrive after processing).
ALTER TABLE booking_notes DROP CONSTRAINT IF EXISTS content_or_images;
ALTER TABLE booking_notes ADD CONSTRAINT booking_notes_content_required
  CHECK (content IS NOT NULL OR images != '[]'::jsonb OR note_type = 'video');

-- Crew posts video notes from the team portal — distinct from 'admin' (office
-- dashboard) so the audit trail can tell field vs. office authorship apart.
ALTER TABLE booking_notes DROP CONSTRAINT IF EXISTS booking_notes_author_type_check;
ALTER TABLE booking_notes ADD CONSTRAINT booking_notes_author_type_check
  CHECK (author_type IN ('admin', 'client', 'system', 'crew'));

CREATE INDEX IF NOT EXISTS idx_booking_notes_job ON booking_notes(job_id) WHERE job_id IS NOT NULL;
-- Recovery-sweep candidates: video notes stuck mid-processing.
CREATE INDEX IF NOT EXISTS idx_booking_notes_processing ON booking_notes(processing_status, created_at)
  WHERE processing_status IN ('uploaded', 'transcribing', 'summarizing');
