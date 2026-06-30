-- Billing address (captured on /qualify) + proposal fields (built at the
-- Proposed stage: 25k setup auto-applied + admin/portal seat counts + totals).
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS billing_city    TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS billing_state   TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS billing_zip     TEXT;

ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS proposal_admins       INT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS proposal_team_members INT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS proposal_setup_fee    INT;   -- dollars, one-time (default 25000)
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS proposal_monthly      INT;   -- dollars/mo, computed
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS proposal_sent_at      TIMESTAMPTZ;
