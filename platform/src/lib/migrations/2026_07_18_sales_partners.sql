-- 2026_07_18_sales_partners.sql
-- Commission Sales Partner program: a second tier on top of the existing
-- referrer program (019_referral_commissions.sql). A sales partner signs
-- direct clients on their own referral_code (same ?ref= flow as referrers)
-- AND recruits referrers, who then carry recruited_by_sales_partner_id --
-- the partner earns commission on both, tracked separately in
-- sales_partner_commissions so a partner's payout never collides with the
-- referrer's own commission on the same booking. Tenant-scoped throughout
-- (nycmaid's source schema was single-tenant; every table/lookup here is
-- tenant_id scoped to match this codebase's multi-tenant model).
-- Ported from nycmaid commits 1e919dba (schema, portal, admin, stacking)
-- and 072ceed0 (payout fields).
-- Apply: PGPASSWORD='<pw>' psql -h db.<project>.supabase.co -p 5432 -U postgres -d postgres -f src/lib/migrations/2026_07_18_sales_partners.sql

BEGIN;

CREATE TABLE IF NOT EXISTS sales_partners (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                text NOT NULL,
  email               text NOT NULL,
  phone               text,
  referral_code       text NOT NULL,
  pin_hash            text NOT NULL,   -- scrypt(pin, pin_salt), see src/lib/sales-partner-auth.ts
  pin_salt            text NOT NULL,
  tier                text NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard','tier2','tier3')),
  commission_rate     numeric(4,3) NOT NULL DEFAULT 0.10,
  total_earned        integer NOT NULL DEFAULT 0,  -- cents
  total_paid          integer NOT NULL DEFAULT 0,  -- cents
  preferred_payout    text DEFAULT 'zelle',
  zelle_email         text,
  zelle_phone         text,
  apple_cash_phone    text,
  active              boolean NOT NULL DEFAULT true,
  approved_at         timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_partners_ref_code_unique UNIQUE (tenant_id, referral_code),
  CONSTRAINT sales_partners_email_unique UNIQUE (tenant_id, email)
);
CREATE INDEX IF NOT EXISTS idx_sales_partners_tenant_active ON sales_partners(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_sales_partners_ref_code ON sales_partners(tenant_id, referral_code);

-- Referrers recruited by a sales partner carry this so the partner earns an
-- override on the referrer's own referred bookings, stacked on top of the
-- referrer's own commission.
ALTER TABLE referrers
  ADD COLUMN IF NOT EXISTS recruited_by_sales_partner_id uuid REFERENCES sales_partners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_referrers_recruited_by ON referrers(recruited_by_sales_partner_id) WHERE recruited_by_sales_partner_id IS NOT NULL;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS sales_partner_id uuid REFERENCES sales_partners(id) ON DELETE SET NULL;

-- Recurring commission is driven off the CLIENT's sticky attribution (mirrors
-- clients.referrer_id -- set once on first booking, checkout reads it on every
-- completed cleaning after), not the one-time booking row.
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS sales_partner_id uuid REFERENCES sales_partners(id) ON DELETE SET NULL;

-- Separate from referral_commissions so a partner's direct/override earnings
-- never merge with (or get double-counted against) a referrer's own payout.
CREATE TABLE IF NOT EXISTS sales_partner_commissions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id          uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sales_partner_id    uuid NOT NULL REFERENCES sales_partners(id) ON DELETE CASCADE,
  source              text NOT NULL CHECK (source IN ('direct','override')),
  referrer_id         uuid REFERENCES referrers(id) ON DELETE SET NULL,  -- set when source = 'override'
  client_name         text,
  gross_amount_cents  integer NOT NULL DEFAULT 0,
  commission_rate     numeric(4,3) NOT NULL DEFAULT 0.10,
  commission_cents    integer NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')),
  paid_at             timestamptz,
  paid_via            text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sp_comm_tenant_status ON sales_partner_commissions(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sp_comm_partner ON sales_partner_commissions(sales_partner_id, created_at DESC);

-- One row per (booking, partner) -- a partner can only earn once per booking
-- even if both direct and override conditions somehow apply.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sp_comm_booking_partner ON sales_partner_commissions(booking_id, sales_partner_id);

COMMIT;
