-- Full schema parity with nycmaid — every column nycmaid has, fullloop now has.
-- Generated from a live diff on 2026-04-19.

-- ============================================================
-- CLIENTS
-- ============================================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_marketing_opt_out BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_marketing_opted_out_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_marketing_opt_out BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_marketing_opted_out_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT true;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_outreach_at TIMESTAMPTZ;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS outreach_status TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS referrer_id UUID;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS selena_memory_summary TEXT;

-- ============================================================
-- TEAM_MEMBERS  (nycmaid "cleaners")
-- ============================================================
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS calendar_color TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS schedule JSONB;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS unavailable_dates DATE[];
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS working_days TEXT[];
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS working_start TIME;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS working_end TIME;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS max_jobs_per_day INTEGER;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

-- ============================================================
-- BOOKINGS
-- ============================================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attributed_domain TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS attribution_confidence NUMERIC;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS team_member_token TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_video_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_video_url_uploaded_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS walkthrough_video_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS walkthrough_video_url_uploaded_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ref_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referrer_id UUID;

-- ============================================================
-- SMS_CONVERSATIONS
-- ============================================================
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS pricing_choice TEXT;
