-- lib/sms-consent.ts's smsOptInFields() has written these 5 fields into
-- clients inserts/updates from the public booking form since cdc52f504
-- (2026-08-03) -- clients only ever had sms_consent (boolean). Every new
-- client who checked the SMS opt-in box at booking time hit a PostgREST
-- "column not found" error on the whole insert, failing the booking outright.
-- Kept as 5 separate fields (not collapsed into sms_consent) on purpose --
-- consent_ip/consent_text/consent_user_agent/sms_consent_at are the audit
-- trail carriers ask for; sms_opt_in and sms_consent both exist because the
-- code writes both (opt_in = the raw checkbox, consent = the legal-consent
-- flag) and neither call site should be assumed synonymous with the other.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_opt_in boolean;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consent_text text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consent_ip text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS consent_user_agent text;
