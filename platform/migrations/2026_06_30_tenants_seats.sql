-- Seat counts carried from the accepted proposal onto the tenant, so billing
-- and the Accounts seat editor have a source of truth (monthly_rate already exists).
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_seats INT DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS team_seats  INT DEFAULT 0;
