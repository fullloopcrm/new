-- 010: Add booking checklist and missing columns to sms_conversations for Selena state machine
-- Run in Supabase SQL editor

ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS booking_checklist JSONB DEFAULT '{}';
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS service_type text;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS hourly_rate integer;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS preferred_date text;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS preferred_time text;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS outcome text;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
