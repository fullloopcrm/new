-- Job photos — LoopCam-style job-site photo documentation under Production.
--
-- WHY: CompanyCam-style value (job-tied, timestamped, geotagged photos with
-- before/after pairing and comments) has no equivalent today. We EXTEND the
-- existing job/booking model rather than build a parallel system:
--   • a photo belongs to a Job, optionally to one Booking (visit/session)
--   • comments on a photo reuse crm_notes (subject_type = 'job_photo')
--   • crew capture (team/checkin, team/checkout) and client capture
--     (/portal) both write here, distinguished by `source`
--
-- Additive + nullable — safe to run on live prod.

-- ─── job_photos ─────────────────────────────────────────
-- job_id is nullable: most bookings are standalone cleanings (job_id NULL on
-- bookings itself, N=1, no row in `jobs` at all) — only multi-day Production
-- jobs have a jobs row. A photo taken at a plain cleaning anchors on
-- booking_id alone. At least one of the two must be set.
CREATE TABLE IF NOT EXISTS job_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE,

  CONSTRAINT job_photos_anchor_required CHECK (job_id IS NOT NULL OR booking_id IS NOT NULL),

  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,   -- for deletion; mirrors /api/uploads path convention

  photo_type   TEXT NOT NULL DEFAULT 'progress'
    CHECK (photo_type IN ('before', 'after', 'progress')),
  pair_id      UUID REFERENCES job_photos(id) ON DELETE SET NULL,  -- links a before <-> after pair

  source       TEXT NOT NULL DEFAULT 'crew'
    CHECK (source IN ('crew', 'client')),
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,  -- set when source = 'crew'
  uploaded_by  TEXT,  -- display label (crew name or "Homeowner"), mirrors crm_notes.author

  caption      TEXT,
  tags         TEXT[] DEFAULT '{}',
  annotations  JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{type, x, y, text, ...}] drawn on the photo

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
-- shape as the comment thread under a single photo, instead of a parallel
-- comments table. image_urls stays unused for this subject_type.
ALTER TABLE crm_notes DROP CONSTRAINT IF EXISTS crm_notes_subject_type_check;
ALTER TABLE crm_notes ADD CONSTRAINT crm_notes_subject_type_check
  CHECK (subject_type IN ('lead', 'tenant', 'job_photo'));

-- ─── job_checklist_items — on-site to-do list per job/visit ──
-- Same anchor pattern as job_photos: most bookings have no jobs row, so a
-- checklist item can anchor on booking_id alone.
CREATE TABLE IF NOT EXISTS job_checklist_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE,
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE,

  CONSTRAINT job_checklist_anchor_required CHECK (job_id IS NOT NULL OR booking_id IS NOT NULL),

  label        TEXT NOT NULL,
  done         BOOLEAN NOT NULL DEFAULT false,
  done_at      TIMESTAMPTZ,
  done_by      TEXT,

  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_checklist_job     ON job_checklist_items(job_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_job_checklist_booking ON job_checklist_items(booking_id, sort_order);

-- ─── jobs gains a public share token for the client photo timeline ──
-- Same pattern as quotes.public_token: generated on demand, unique, no auth
-- needed to view — the token itself is the credential.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_jobs_public_token ON jobs(public_token) WHERE public_token IS NOT NULL;
