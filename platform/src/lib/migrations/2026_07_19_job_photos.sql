-- Job photos & videos — CompanyCam-style job-site media documentation under
-- Production.
--
-- WHY: CompanyCam's core value (job-tied, timestamped, geotagged media with
-- before/after pairing and comments) has no equivalent today. We EXTEND the
-- existing job/booking model rather than build a parallel system:
--   • a media item belongs to a Job, optionally to one Booking (visit/session)
--   • comments on a media item reuse crm_notes (subject_type = 'job_photo',
--     kept as-is for both photos and videos to avoid a second thread table)
--   • crew capture (team/checkin, team/checkout) and client capture
--     (/portal) both write here, distinguished by `source`
--   • video was added alongside photo from the start of this table's life —
--     `media_type` distinguishes the two; video rows go through the
--     signed-upload-url flow (createSignedUploadUrl + verifySignedUpload)
--     since a multipart POST through a serverless function hits the ~4.5MB
--     Vercel body cap that video files routinely exceed
--
-- Additive + nullable — safe to run on live prod.

-- ─── job_photos ─────────────────────────────────────────
-- job_id is nullable: most bookings are standalone cleanings (job_id NULL on
-- bookings itself, N=1, no row in `jobs` at all) — only multi-day Production
-- jobs have a jobs row. A photo/video taken at a plain cleaning anchors on
-- booking_id alone. At least one of the two must be set.
CREATE TABLE IF NOT EXISTS job_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE,

  CONSTRAINT job_photos_anchor_required CHECK (job_id IS NOT NULL OR booking_id IS NOT NULL),

  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,   -- for deletion; mirrors /api/uploads path convention

  media_type   TEXT NOT NULL DEFAULT 'photo'
    CHECK (media_type IN ('photo', 'video')),
  duration_seconds INTEGER,     -- video only; client-reported, not server-verified

  photo_type   TEXT NOT NULL DEFAULT 'progress'
    CHECK (photo_type IN ('before', 'after', 'progress')),
  pair_id      UUID REFERENCES job_photos(id) ON DELETE SET NULL,  -- links a before <-> after pair

  source       TEXT NOT NULL DEFAULT 'crew'
    CHECK (source IN ('crew', 'client')),
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,  -- set when source = 'crew'
  uploaded_by  TEXT,  -- display label (crew name or "Homeowner"), mirrors crm_notes.author

  caption      TEXT,
  tags         TEXT[] DEFAULT '{}',
  annotations  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{type, x, y, text, ...}] drawn on the photo (photo only)

  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  taken_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job      ON job_photos(job_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_photos_booking  ON job_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_tenant   ON job_photos(tenant_id, created_at DESC);

-- ─── crm_notes gains 'job_photo' as a comment thread subject ──
-- Reuses the existing (subject_type, subject_id, body, author, created_at)
-- shape as the comment thread under a single photo or video, instead of a
-- parallel comments table. image_urls stays unused for this subject_type.
ALTER TABLE crm_notes DROP CONSTRAINT IF EXISTS crm_notes_subject_type_check;
ALTER TABLE crm_notes ADD CONSTRAINT crm_notes_subject_type_check
  CHECK (subject_type IN ('lead', 'tenant', 'job_photo'));
