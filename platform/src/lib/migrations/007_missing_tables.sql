-- Migration 007: Create missing tables referenced in code
-- This fixes the critical blocking issues for tenant onboarding

-- ============================================
-- 1. tenant_settings — wide-form settings per tenant
-- Used by: src/lib/settings.ts, cron/auto-reply-reviews, admin/billing, admin/sales
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  -- Business info
  business_name text DEFAULT '',
  business_phone text DEFAULT '',
  business_email text DEFAULT '',
  business_website text DEFAULT '',
  admin_email text DEFAULT '',
  email_from_name text DEFAULT '',
  email_from_address text DEFAULT '',
  -- Services & Pricing
  service_types jsonb DEFAULT '[]'::jsonb,
  standard_rate integer DEFAULT 0,
  payment_methods jsonb DEFAULT '["zelle","stripe"]'::jsonb,
  -- Scheduling
  business_hours_start integer DEFAULT 9,
  business_hours_end integer DEFAULT 17,
  booking_buffer_minutes integer DEFAULT 60,
  default_duration_hours integer DEFAULT 2,
  min_days_ahead integer DEFAULT 1,
  allow_same_day boolean DEFAULT false,
  -- Referrals & Policies
  commission_rate numeric DEFAULT 10,
  active_client_threshold_days integer DEFAULT 45,
  at_risk_threshold_days integer DEFAULT 90,
  reschedule_notice_hours integer DEFAULT 48,
  -- Notifications
  reminder_days jsonb DEFAULT '[3, 1]'::jsonb,
  reminder_hours_before jsonb DEFAULT '[2]'::jsonb,
  daily_summary_enabled boolean DEFAULT true,
  client_reminder_email boolean DEFAULT true,
  client_reminder_sms boolean DEFAULT true,
  -- AI Chatbot
  chatbot_enabled boolean DEFAULT false,
  chatbot_greeting text DEFAULT 'Hola, Thank you for reaching out. How are you?',
  -- Team Guidelines
  team_guidelines text,
  guidelines_updated_at timestamptz,
  -- Google integration
  google_auto_reply boolean DEFAULT false,
  -- Billing
  billing_email text,
  billing_notes text,
  stripe_customer_id text,
  subscription_status text DEFAULT 'active',
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant ON tenant_settings(tenant_id);

-- ============================================
-- 2. platform_settings — key-value store for platform-wide config
-- Used by: src/app/api/admin/settings/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS platform_settings (
  key text PRIMARY KEY,
  value text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 3. Fix tenant_invites — add missing columns
-- Used by: src/app/api/admin/invites/route.ts, src/app/join/[token]/
-- ============================================
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS role text DEFAULT 'owner';
ALTER TABLE tenant_invites ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ============================================
-- 4. sms_conversations — chatbot conversation tracking
-- Used by: src/app/api/webhooks/telnyx/route.ts, src/app/api/admin/sms/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS sms_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  name text,
  state text DEFAULT 'welcome',
  expired boolean DEFAULT false,
  completed_at timestamptz,
  last_message_at timestamptz DEFAULT now(),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_tenant_phone ON sms_conversations(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_active ON sms_conversations(tenant_id, expired, completed_at) WHERE expired = false AND completed_at IS NULL;

-- ============================================
-- 5. sms_conversation_messages — individual messages in a conversation
-- Used by: src/app/api/webhooks/telnyx/route.ts, src/app/api/clients/[id]/transcript/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS sms_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES sms_conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation ON sms_conversation_messages(conversation_id, created_at);

-- ============================================
-- 6. client_sms_messages — SMS history per client
-- Used by: src/app/api/webhooks/telnyx/route.ts, src/app/api/clients/[id]/transcript/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS client_sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_sms_tenant ON client_sms_messages(tenant_id, client_id, created_at DESC);

-- ============================================
-- 7. team_notifications — notifications for team members
-- Used by: src/lib/notify-team.ts
-- ============================================
CREATE TABLE IF NOT EXISTS team_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES team_members(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  read boolean DEFAULT false,
  read_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_notifications_member ON team_notifications(team_member_id, read, created_at DESC);

-- ============================================
-- 8. platform_feedback — user feedback collection
-- Used by: src/app/api/feedback/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  message text NOT NULL,
  status text DEFAULT 'new',
  admin_notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 9. team_applications — team member job applications
-- Used by: src/app/api/team-applications/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS team_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  experience text,
  availability text,
  referral_source text,
  references text,
  notes text,
  photo_url text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_applications_tenant ON team_applications(tenant_id, status, created_at DESC);

-- ============================================
-- 10. marketing_opt_out_log — audit trail for opt-outs
-- Used by: src/app/api/unsubscribe/route.ts
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_opt_out_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  channel text NOT NULL,
  method text DEFAULT 'link',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 11. Add missing columns to clients table
-- Used by: src/app/api/campaigns/send/route.ts, src/app/api/unsubscribe/route.ts
-- ============================================
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_marketing_opt_out boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_marketing_opt_out boolean DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_marketing_opted_out_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_marketing_opted_out_at timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_team_member_id uuid REFERENCES team_members(id) ON DELETE SET NULL;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS sms_consent boolean DEFAULT true;

-- ============================================
-- 12. Add missing columns to campaigns table
-- Used by: src/app/api/webhooks/resend/route.ts, src/app/api/campaigns/send/route.ts
-- ============================================
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS delivered_count integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS opened_count integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS failed_count integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_count integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS total_recipients integer DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS recipient_filter text DEFAULT 'all';
