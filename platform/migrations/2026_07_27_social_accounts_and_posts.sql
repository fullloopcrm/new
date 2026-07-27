-- Social media integration (2026-07-27)
-- src/lib/social.ts, src/app/api/social/*, and src/app/dashboard/social were
-- already built against these two tables, but the tables themselves were
-- never created -- the feature has been fully inert in prod. Idempotent.

CREATE TABLE IF NOT EXISTS public.social_accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  account_id text NOT NULL,
  account_name text NOT NULL,
  access_token text NOT NULL,
  token_expires_at timestamptz,
  page_id text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_social_accounts_tenant ON public.social_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_expiring ON public.social_accounts(token_expires_at) WHERE token_expires_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.social_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('facebook', 'instagram')),
  external_post_id text,
  content text,
  photo_url text,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_social_posts_tenant ON public.social_posts(tenant_id, created_at DESC);
