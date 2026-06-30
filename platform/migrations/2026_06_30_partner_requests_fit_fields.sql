-- Carry the /qualify prequalifying answers onto the lead bucket (partner_requests)
-- so every field shows on the Leads page, plus a computed FIT score + bucket.
-- Score qualifies on intent (growth + automation), never auto-rejects.
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS revenue_trajectory TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS growth_goal        TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS automation_comfort TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS lead_gen_spend     TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS pain_point         TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS timeline           TEXT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS wants_automation   BOOLEAN;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS wants_growth       BOOLEAN;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS comparing_prices   BOOLEAN;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS fit_score          INT;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS fit_bucket         TEXT;

CREATE INDEX IF NOT EXISTS idx_partner_requests_fit ON partner_requests(fit_bucket, fit_score DESC);
