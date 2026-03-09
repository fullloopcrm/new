-- Add new columns to tenants table for onboarding + setup checklist
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS team_size TEXT DEFAULT 'solo';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS setup_dismissed BOOLEAN DEFAULT false;
