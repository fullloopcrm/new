-- Verified/manual conversion flags, carried over from nycmaid's standalone
-- lead_clicks table so the February-2026-onward historical backfill doesn't
-- lose them.
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS true_conversion BOOLEAN DEFAULT FALSE;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS manual_conversion BOOLEAN DEFAULT FALSE;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS manual_sale BOOLEAN DEFAULT FALSE;
