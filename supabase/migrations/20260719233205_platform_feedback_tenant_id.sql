-- Adopted from legacy hand-run migration: 2026_07_18_platform_feedback_tenant_id.sql
-- Original commit date (git first-add): 2026-07-19T19:32:04-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- platform_feedback tenant tagging (2026-07-18)
-- Dashboard feedback submissions are now authenticated (tenant session), so
-- tag each row with the sending tenant instead of staying fully anonymous.
-- Public marketing-site widget submissions have no session and keep
-- tenant_id NULL (still anonymous, unchanged behavior).
-- Idempotent: safe to re-run.

ALTER TABLE IF EXISTS public.platform_feedback
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_platform_feedback_tenant ON public.platform_feedback(tenant_id);
