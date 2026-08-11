-- Backs the mobile Com Hub Settings > Notifications screen
-- (/api/mobile/comhub/preferences, src/components/comhub-notification-prefs.tsx).
--
-- Deliberately a SEPARATE column from tenants.notification_preferences, not a
-- new key inside it: src/app/api/settings/notifications/route.ts's PUT does a
-- full overwrite of that column with normalizePrefs(body) (drops any key not
-- in {comms,timing,policy}) every time a tenant saves the Communications
-- settings tab -- storing Com Hub's prefs inside that column would make them
-- silently vanish the next time someone touches an unrelated settings page.
--
-- Also a different shape than notification_preferences' comms-registry keys:
-- Com Hub's event types (new_message/missed_call/voicemail) aren't
-- automated-comm registry entries, and the app expects a push/email/sms
-- channel trio (comms-registry only has email/sms/in_app, no push).
--
-- Tenant-level (shared by every dashboard/admin member of the tenant), same
-- granularity as notification_preferences -- not per-user. See
-- src/app/api/mobile/comhub/preferences/route.ts for the caveat on that.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS comhub_notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.comhub_notification_preferences IS
  'Com Hub (mobile) notification prefs: { "<event_type>": { "push": bool, "email": bool, "sms": bool } }. Tenant-level, not per-user. NULL/{} => defaults applied in route.';
