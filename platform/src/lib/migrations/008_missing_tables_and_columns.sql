-- Migration 008: Add missing columns and tables
-- Fixes: stripe_api_key column, 10 missing tables, missing tenant columns

-- ============================================
-- 1. Add missing columns to tenants
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_api_key TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS resend_domain TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_from TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS team_size TEXT DEFAULT 'solo';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 10;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS attribution_window_hours INTEGER DEFAULT 168;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_client_threshold_days INTEGER DEFAULT 45;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS at_risk_threshold_days INTEGER DEFAULT 90;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS reschedule_notice_days INTEGER DEFAULT 2;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER DEFAULT 60;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_duration_hours NUMERIC DEFAULT 3;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS min_days_ahead INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS allow_same_day BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours_start TEXT DEFAULT '09:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_hours_end TEXT DEFAULT '17:00';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS guidelines_en TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS guidelines_es TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS guidelines_updated_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['zelle','stripe'];
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS zelle_email TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS apple_cash_phone TEXT;

-- Add missing columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_link TEXT;

-- Add retry_count to notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
-- Allow null tenant_id for system-level notifications
ALTER TABLE notifications ALTER COLUMN tenant_id DROP NOT NULL;

-- ============================================
-- 2. campaign_recipients — per-recipient tracking for campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_client ON campaign_recipients(client_id);

-- ============================================
-- 3. email_logs — track individual email sends
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  resend_id TEXT,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id, created_at DESC);

-- ============================================
-- 4. platform_announcements — admin announcements to all tenants
-- ============================================
CREATE TABLE IF NOT EXISTS platform_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. platform_announcement_reads — track which users read announcements
-- ============================================
CREATE TABLE IF NOT EXISTS platform_announcement_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES platform_announcements(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(announcement_id, tenant_id)
);

-- ============================================
-- 6. security_events — audit log for security-sensitive actions
-- ============================================
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_tenant ON security_events(tenant_id, created_at DESC);

-- ============================================
-- 7. payroll_payments — track team member payments
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  method TEXT DEFAULT 'zelle',
  status TEXT DEFAULT 'pending',
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_tenant ON payroll_payments(tenant_id, created_at DESC);

-- ============================================
-- 8. referral_commissions — track referral payouts
-- ============================================
CREATE TABLE IF NOT EXISTS referral_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  referrer_client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_tenant ON referral_commissions(tenant_id);

-- ============================================
-- 9. partner_requests — partnership/onboarding requests
-- ============================================
CREATE TABLE IF NOT EXISTS partner_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. push_subscriptions — web push notification subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'team_member', 'client')),
  user_id TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_type, user_id)
);

-- ============================================
-- 11. google_posts — Google Business Profile posts
-- ============================================
CREATE TABLE IF NOT EXISTS google_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  google_post_id TEXT,
  type TEXT DEFAULT 'standard',
  summary TEXT,
  image_url TEXT,
  call_to_action_type TEXT,
  call_to_action_url TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_posts_tenant ON google_posts(tenant_id, created_at DESC);

-- ============================================
-- 12. RLS on new tables
-- ============================================
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_posts ENABLE ROW LEVEL SECURITY;
