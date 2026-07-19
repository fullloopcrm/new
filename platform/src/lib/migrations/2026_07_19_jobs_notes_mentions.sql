-- @-mention tagging on job notes (2026-07-19)
-- Ports the sales pipeline's deal-note @-mention pattern
-- (2026_07_18_deal_activity_mentions.sql / deal_activities.tagged_user_ids)
-- onto the Job detail "Job notes" field. Unlike deal activities (an
-- append-only log where each note is its own row), job notes is a single
-- mutable field on the job itself, so the tagged ids live directly on
-- jobs rather than a separate table -- they represent "who is currently
-- mentioned in the saved notes text". Idempotent.
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS notes_tagged_user_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_jobs_notes_tagged_user_ids
  ON public.jobs USING gin (notes_tagged_user_ids);
