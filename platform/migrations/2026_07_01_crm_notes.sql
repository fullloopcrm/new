-- CRM notes: timestamped, authored, image-capable notes that attach to a
-- lead OR a tenant and flow through the lifecycle (copied to the tenant on convert).
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('lead', 'tenant')),
  subject_id UUID NOT NULL,
  body TEXT,
  image_urls TEXT[] DEFAULT '{}',
  author TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_subject
  ON crm_notes(subject_type, subject_id, created_at DESC);
