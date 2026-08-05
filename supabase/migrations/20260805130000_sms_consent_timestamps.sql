-- Toll-free SMS verification requires proof of opt-in consent, timestamped.
-- The marketing lead form (/#lead-form) now carries two optional, unchecked
-- consent checkboxes (transactional + marketing). Record when each was
-- given as a nullable timestamp — NULL means never consented, a value means
-- consent was given at that moment. Both target tables the /api/inquiry
-- route writes to (inquiries, partner_requests).

ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS sms_transactional_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_at TIMESTAMPTZ;

ALTER TABLE partner_requests
  ADD COLUMN IF NOT EXISTS sms_transactional_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_at TIMESTAMPTZ;
