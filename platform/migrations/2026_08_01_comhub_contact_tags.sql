-- ─── comhub_contacts manual tagging ──────────────────────────────
-- The sidebar badges every unlinked contact "lead" purely because it has no
-- client_id/team_member_id — automated senders (receipts, marketing blasts,
-- phishing-style "verification code" emails) get the same badge as a real
-- prospect. This adds a manual, per-contact tag so an admin can quickly
-- reclassify what the auto-linker got wrong. Starts manual; automated
-- detection can layer on top later without a schema change.
ALTER TABLE comhub_contacts
  ADD COLUMN IF NOT EXISTS tag TEXT
    CHECK (tag IS NULL OR tag IN ('potential_lead', 'spam', 'vendor', 'other'));

CREATE INDEX IF NOT EXISTS idx_comhub_contacts_tag
  ON comhub_contacts(tenant_id, tag) WHERE tag IS NOT NULL;

NOTIFY pgrst, 'reload schema';
