-- nycmaid parity: cleaner_applications (prospective team-member applications)
-- Distinct from fullloop's management_applications (which is about applying to manage a tenant).

CREATE TABLE IF NOT EXISTS cleaner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  experience TEXT,
  availability TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','accepted','rejected')),
  reviewed_at TIMESTAMPTZ,
  photo_url TEXT,
  referral_source TEXT,
  "references" JSONB,
  service_zones TEXT[],
  has_car BOOLEAN,
  max_travel_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cleaner_apps_tenant_status ON cleaner_applications(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cleaner_apps_email ON cleaner_applications(lower(email)) WHERE email IS NOT NULL;
ALTER TABLE cleaner_applications ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
