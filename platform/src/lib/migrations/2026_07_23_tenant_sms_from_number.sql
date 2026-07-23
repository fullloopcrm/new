-- Optional override for the "from" address used by admin/owner notification
-- SMS (smsAdmins/lib/sms.ts), for tenants whose voice DID
-- (tenants.telnyx_phone) isn't SMS-messaging-enabled — e.g. a dedicated
-- toll-free voice-only line with no Telnyx messaging profile attached.
-- NULL (falls back to telnyx_phone) for every tenant that doesn't need the
-- split.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_from_number text;
