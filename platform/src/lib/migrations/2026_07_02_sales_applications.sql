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
