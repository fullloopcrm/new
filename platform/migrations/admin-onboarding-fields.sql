-- Expanded admin onboarding fields for full stack setup tracking
-- Gmail account created for the business (used to register all integrations)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gmail_account TEXT;

-- Domain for the business (custom or subdomain)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS domain_name TEXT;

-- DNS configuration status
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dns_configured BOOLEAN DEFAULT FALSE;

-- Email domain verification status in Resend
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_domain_verified BOOLEAN DEFAULT FALSE;

-- SMS phone number (separate from business phone — this is the Telnyx number)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sms_number TEXT;

-- Website published status
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_published BOOLEAN DEFAULT FALSE;

-- Website content (about text, tagline, hero image, etc.)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_content JSONB DEFAULT '{}';

-- Manual setup checkoffs that can't be auto-detected
-- Stores: { gmail_created, resend_account_created, telnyx_account_created,
--           dns_records_added, tracking_installed, test_booking_done,
--           test_email_received, test_sms_received, credentials_shared }
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_progress JSONB DEFAULT '{}';
