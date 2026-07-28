-- Adopted from legacy hand-run migration: 2026_07_02_sales_applications.sql
-- Original commit date (git first-add): 2026-07-02T14:24:50-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Commission Sales Partner applications (tenant-scoped port of nycmaid
-- 2026_07_01_sales_applications). Mirrors team_applications multi-tenancy:
-- every row carries tenant_id; all reads/writes are tenant-scoped in the API.
-- Selfie video is required (video_url NOT NULL); no headshot photo collected.
CREATE TABLE IF NOT EXISTS public.sales_applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              text NOT NULL,
  email             text NOT NULL,
  phone             text NOT NULL,
  location          text,
  lane              text,                       -- direct | referrer | both
  sales_background  text,
  target_segments   text[] DEFAULT '{}',        -- which segments they can reach
  warm_intros       text,                       -- warm intros in first 30 days
  bilingual         text,
  why               text,                       -- why sales / why this business
  referral_source   text,                       -- how they found us
  linkedin_url      text,                       -- optional
  video_url         text NOT NULL,              -- required 60s selfie video
  notes             text,
  status            text NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sales_applications_tenant_status
  ON public.sales_applications(tenant_id, status, created_at DESC);
