-- Backs POST /api/mobile/push-token — the mobile app's real Expo push-token
-- registration (src/lib/notifications.ts's submitPushToken()), which was
-- calling a route that didn't exist anywhere in this backend, so every
-- registration attempt 404'd silently.
--
-- Per-device, per-role: a person can be an admin on one tenant and a client
-- on another, and the same physical device can be logged into multiple
-- roles at once during testing — (tenant_id, role, member_id, platform) is
-- the natural key, not the raw token, since a device's Expo push token can
-- itself change (reinstall, OS update) and a stale one should just be
-- overwritten, not accumulate duplicate rows.
--
-- No sending logic exists yet anywhere in this backend (grepped for
-- expo-server-sdk / ExpoPushToken / sendPushNotification -- zero hits) --
-- this table is storage only, so a real send path has somewhere real to
-- read tokens from once that's built. Not scope-created here.

CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'team', 'client', 'sales')),
  member_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  push_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role, member_id, platform)
);

CREATE INDEX IF NOT EXISTS mobile_push_tokens_tenant_idx ON public.mobile_push_tokens (tenant_id);

COMMENT ON TABLE public.mobile_push_tokens IS
  'Expo push tokens registered by the Full Loop Mobile app, one row per (tenant, role, member, platform). Storage only -- no send path reads this yet.';

-- No policy defined, matching security_events.sql's convention for a table
-- only ever touched via supabaseAdmin (service role, bypasses RLS) from API
-- routes -- this just blocks any anon/authenticated Supabase client key
-- from reading device push tokens directly.
ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;
