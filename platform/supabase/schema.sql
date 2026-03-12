-- ============================================================
-- FULL LOOP CRM — FOUNDATION SCHEMA
-- ============================================================

-- TENANTS — each business using the platform
CREATE TABLE tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                          -- "Sparkle Cleaning Chicago"
  slug TEXT UNIQUE NOT NULL,                   -- "sparkle-cleaning" (used in subdomain)
  domain TEXT,                                 -- custom domain: "sparklecleaning.com"
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1E2A4A',
  secondary_color TEXT DEFAULT '#A8F0DC',
  timezone TEXT DEFAULT 'America/New_York',
  currency TEXT DEFAULT 'USD',
  industry TEXT DEFAULT 'cleaning',            -- cleaning, plumbing, hvac, etc.
  status TEXT DEFAULT 'active',                -- active, suspended, cancelled

  -- Per-tenant API keys (they own their own accounts)
  resend_api_key TEXT,
  resend_domain TEXT,
  email_from TEXT,
  telnyx_api_key TEXT,
  telnyx_phone TEXT,
  stripe_api_key TEXT,                         -- Stripe secret key
  stripe_account_id TEXT,                      -- Stripe Connect account
  google_place_id TEXT,                        -- for review collection

  -- Branding
  business_hours TEXT DEFAULT '24/7',
  tagline TEXT,
  website_url TEXT,
  zip_code TEXT,
  team_size TEXT DEFAULT 'solo',

  -- Scheduling
  booking_buffer_minutes INTEGER DEFAULT 60,
  default_duration_hours NUMERIC DEFAULT 3,
  min_days_ahead INTEGER DEFAULT 1,
  allow_same_day BOOLEAN DEFAULT false,
  business_hours_start TEXT DEFAULT '09:00',
  business_hours_end TEXT DEFAULT '17:00',

  -- Policies
  commission_rate NUMERIC DEFAULT 10,
  active_client_threshold_days INTEGER DEFAULT 45,
  at_risk_threshold_days INTEGER DEFAULT 90,
  reschedule_notice_days INTEGER DEFAULT 2,

  -- Guidelines
  guidelines_en TEXT,
  guidelines_es TEXT,
  guidelines_updated_at TIMESTAMPTZ,

  -- Payment methods
  payment_methods TEXT[] DEFAULT ARRAY['zelle','stripe'],
  zelle_email TEXT,
  apple_cash_phone TEXT,

  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TENANT MEMBERS — who can log into each tenant's dashboard
CREATE TABLE tenant_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,                 -- Clerk user ID
  role TEXT DEFAULT 'admin',                   -- owner, admin, dispatcher, viewer
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, clerk_user_id)
);

-- SERVICE TYPES — configurable per tenant
CREATE TABLE service_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- "Standard Cleaning", "Deep Clean"
  description TEXT,
  default_duration_hours NUMERIC DEFAULT 3,
  default_hourly_rate NUMERIC,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENTS — each tenant's customers
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  unit TEXT,
  notes TEXT,
  special_instructions TEXT,
  source TEXT,                                 -- 'website', 'referral', 'sms', 'manual'
  referral_code TEXT,
  email_opt_in BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active',                -- active, inactive, do_not_contact
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEAM MEMBERS — each tenant's field workers (cleaners, techs, etc.)
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  pin TEXT,                                    -- 4-digit PIN for portal login
  role TEXT DEFAULT 'worker',                  -- worker, lead, manager
  status TEXT DEFAULT 'active',                -- active, inactive, suspended
  hourly_rate NUMERIC,
  pay_rate NUMERIC,                            -- what they get paid
  notes TEXT,
  push_subscription JSONB,                     -- web push subscription
  preferred_language TEXT DEFAULT 'en',         -- en, es
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOOKINGS — individual jobs
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  team_member_id UUID REFERENCES team_members(id),
  schedule_id UUID,                            -- links to recurring_schedules
  service_type_id UUID REFERENCES service_types(id),
  service_type TEXT,                           -- denormalized name for display
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'scheduled',             -- pending, scheduled, in_progress, completed, cancelled, available
  price INTEGER DEFAULT 0,                     -- in cents
  hourly_rate NUMERIC,
  pay_rate NUMERIC,                            -- team member pay rate for this job
  recurring_type TEXT,
  notes TEXT,
  special_instructions TEXT,

  -- Check-in/out
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_lat NUMERIC,
  check_in_lng NUMERIC,

  -- Team member token (for portal access)
  worker_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Payment
  payment_status TEXT DEFAULT 'unpaid',        -- unpaid, paid, partial
  payment_method TEXT,
  payment_date TIMESTAMPTZ,
  tip_amount INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RECURRING SCHEDULES — parent record for booking series
CREATE TABLE recurring_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  team_member_id UUID REFERENCES team_members(id),
  service_type_id UUID REFERENCES service_types(id),
  recurring_type TEXT NOT NULL,
  day_of_week INTEGER,
  preferred_time TIME,
  duration_hours NUMERIC DEFAULT 3,
  hourly_rate NUMERIC,
  pay_rate NUMERIC,
  notes TEXT,
  special_instructions TEXT,
  status TEXT DEFAULT 'active',                -- active, paused, cancelled
  paused_until DATE,
  next_generate_after DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key after both tables exist
ALTER TABLE bookings ADD CONSTRAINT bookings_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES recurring_schedules(id);

-- NOTIFICATIONS — log of all notifications sent
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                          -- booking_confirmed, reminder, review_request, etc.
  title TEXT,
  message TEXT,
  channel TEXT,                                -- email, sms, push
  recipient_type TEXT,                         -- client, team_member, admin
  recipient_id UUID,
  booking_id UUID REFERENCES bookings(id),
  status TEXT DEFAULT 'sent',                  -- sent, failed, pending
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REVIEWS — review collection pipeline
CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  booking_id UUID REFERENCES bookings(id),
  team_member_id UUID REFERENCES team_members(id),
  rating INTEGER,                              -- 1-5
  comment TEXT,
  source TEXT DEFAULT 'internal',              -- internal, google, yelp
  google_review_url TEXT,
  status TEXT DEFAULT 'pending',               -- pending, collected, posted
  requested_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CAMPAIGNS — marketing campaigns
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'email',                   -- email, sms
  subject TEXT,
  body TEXT,
  status TEXT DEFAULT 'draft',                 -- draft, scheduled, sent
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFERRALS — referral tracking
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  referrer_client_id UUID REFERENCES clients(id),
  referred_client_id UUID REFERENCES clients(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending',               -- pending, converted, paid
  reward_amount INTEGER DEFAULT 0,             -- in cents
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DOMAINS — SEO domain network per tenant
CREATE TABLE domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  type TEXT DEFAULT 'seo',                     -- primary, seo, redirect
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_clerk ON tenant_members(clerk_user_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_team_members_tenant ON team_members(tenant_id);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_team_member ON bookings(team_member_id);
CREATE INDEX idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_recurring_schedules_tenant ON recurring_schedules(tenant_id);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_reviews_tenant ON reviews(tenant_id);
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_referrals_tenant ON referrals(tenant_id);
CREATE INDEX idx_domains_tenant ON domains(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS, so all server-side operations work.
-- Client-side queries would need RLS policies per tenant.
-- We'll add granular policies as needed.
