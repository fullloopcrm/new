-- Track when a sales lead (partner_requests) was last contacted, and which
-- stale-followup thresholds (7/14/30 days) have already fired a digest
-- notification, so the cron doesn't re-notify the same threshold twice.
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS notified_7d_at TIMESTAMPTZ;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS notified_14d_at TIMESTAMPTZ;
ALTER TABLE partner_requests ADD COLUMN IF NOT EXISTS notified_30d_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_partner_requests_contacted_status
  ON partner_requests(status, last_contacted_at);

-- Backfill: leads already past "new" have been contacted at least once —
-- reviewed_at is the closest existing signal (stamped on every stage move).
-- Without this, every real in-flight lead would start the new "Contacted,
-- Not Sold" filter with no last-contacted date and never surface in the
-- follow-up cron until the next manual stage change or note.
UPDATE partner_requests
SET last_contacted_at = reviewed_at
WHERE status IN ('contacted', 'qualified', 'proposed')
  AND last_contacted_at IS NULL
  AND reviewed_at IS NOT NULL;
