-- Communications system (merged in 945e74b) reads/writes tenants.notification_preferences
-- via lib/comms-prefs.ts (getCommPrefs / isCommEnabled) and the Communications settings
-- tab. The code shipped but this column was never added to prod, so getCommPrefs errors
-- and silently falls back to defaults — tenants cannot save or gate any notification
-- preferences. This adds the missing jsonb column. Idempotent.
--
-- Shape (see normalizePrefs): { "comms": { "<comm_key>": { "email": bool, "sms": bool,
-- "in_app": bool, "template": {...} } }, "timing": { ... } }. NULL / {} both normalize
-- to per-comm defaults, so no backfill is required.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.notification_preferences IS
  'Tenant-controlled comms gating + timing. Normalized by lib/comms-prefs.ts normalizePrefs(); NULL/{} => defaults.';
