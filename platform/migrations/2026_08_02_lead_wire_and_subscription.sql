-- Billing automation (2026-08-02): the $25k setup fee is a bank wire, never a
-- Stripe charge; the $2,500/mo subscription starts at proposal-sign, before a
-- tenant exists. Both now need to be tracked on the LEAD (partner_requests),
-- since tenant creation itself is triggered by wire confirmation, not by the
-- Stripe checkout completing.
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS wire_received_at        TIMESTAMPTZ;
