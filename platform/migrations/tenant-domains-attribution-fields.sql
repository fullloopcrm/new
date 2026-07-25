-- Columns src/lib/domains.ts already expects but tenant_domains never had —
-- the attribution engine wired into booking creation has been silently
-- failing on these missing columns.
ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'generic';
ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE tenant_domains ADD COLUMN IF NOT EXISTS zip_codes TEXT[];

-- deals mirrors bookings' existing attributed_domain/attribution_confidence
-- fields so lead source flows through the sales pipeline the same way.
ALTER TABLE deals ADD COLUMN IF NOT EXISTS attributed_domain TEXT;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS attribution_confidence INTEGER;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ;
