-- Adopted from legacy hand-run migration: 010_selena_checklist.sql
-- Original commit date (git first-add): 2026-03-23T20:19:23-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
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
