-- 019_referral_commissions.sql
-- External affiliate referrers + their per-booking commission ledger.
-- Distinct from `referrals` (client-to-client). Admin marks commissions as paid
-- once the payout actually clears. Tenant-scoped.
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/019_referral_commissions.sql

BEGIN;

-- External affiliate referrers (drive traffic via ref_code, earn commission).
CREATE TABLE IF NOT EXISTS referrers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  referral_code text NOT NULL,
  commission_rate numeric(4,3) NOT NULL DEFAULT 0.10,
  preferred_payout text,            -- e.g. 'zelle', 'venmo', 'ach'
  payout_details jsonb,              -- e.g. { zelle_email, venmo_handle }
  total_earned integer NOT NULL DEFAULT 0,
  total_paid integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrers_code_unique UNIQUE (tenant_id, referral_code)
);
CREATE INDEX IF NOT EXISTS idx_referrers_tenant_status ON referrers(tenant_id, status);

-- Add bookings.referrer_id so commission queries can filter.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES referrers(id);
CREATE INDEX IF NOT EXISTS idx_bookings_referrer ON bookings(referrer_id) WHERE referrer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  client_name text,
  gross_amount_cents integer NOT NULL DEFAULT 0,
  commission_rate numeric(4,3) NOT NULL DEFAULT 0.10,
  commission_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',  -- pending | paid | void
  paid_at timestamptz,
  paid_via text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_commissions_booking_unique UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_ref_comm_tenant_status
  ON referral_commissions(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ref_comm_referrer
  ON referral_commissions(referrer_id, created_at DESC);

COMMIT;
