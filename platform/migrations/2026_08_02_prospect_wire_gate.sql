-- Self-serve signup wire gate (2026-08-02): mirrors partner_requests. Stripe
-- payment alone no longer creates+activates a tenant for self-serve prospects
-- either -- it only records the subscription. Tenant creation is gated on an
-- admin confirming the $25k wire landed (see prospects/[id]/wire-received).
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS wire_received_at        TIMESTAMPTZ;
