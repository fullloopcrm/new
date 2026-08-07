-- Idempotency stamp for the one-time "just following up" nudge sent to a
-- ComHub contact who reached out, was reviewed, and never became a client
-- (Jeff, 2026-08-07). NULL = never sent; set once, never re-sent to that
-- contact by the comhub-lead-followup cron.

ALTER TABLE comhub_contacts
  ADD COLUMN IF NOT EXISTS followup_sent_at timestamptz;
