-- Expanded website_visits for rich tracking from t.js
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS visitor_id TEXT;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'visit';
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS active_time INTEGER;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS cta_clicked BOOLEAN DEFAULT FALSE;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS load_time_ms INTEGER;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS placement TEXT;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS screen_w INTEGER;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS screen_h INTEGER;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE website_visits ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Index for faster visitor/session queries
CREATE INDEX IF NOT EXISTS idx_visits_session ON website_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON website_visits(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_action ON website_visits(action);
