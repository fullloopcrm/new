-- Expenses tracking
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  receipt_url TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_expenses_tenant ON expenses(tenant_id);
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Payroll payment records
CREATE TABLE payroll_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id),
  amount INTEGER NOT NULL DEFAULT 0,
  method TEXT,
  period_start DATE,
  period_end DATE,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_payroll_tenant ON payroll_payments(tenant_id);
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;

-- Website visit tracking
CREATE TABLE website_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(id),
  referrer TEXT,
  device TEXT,
  session_id TEXT,
  page_url TEXT,
  scroll_depth INTEGER,
  time_on_page INTEGER,
  cta_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_visits_tenant ON website_visits(tenant_id);
CREATE INDEX idx_visits_domain ON website_visits(domain_id);
CREATE INDEX idx_visits_created ON website_visits(created_at);
ALTER TABLE website_visits ENABLE ROW LEVEL SECURITY;
