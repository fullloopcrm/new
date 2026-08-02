-- Expand comhub_contacts.tag presets: add 'client', 'team', 'lead' so an
-- admin can force-correct the auto-derived role badge (e.g. a Nextdoor
-- notification email getting the same "Potential Lead" badge as a real
-- prospect) the same way 'spam'/'vendor'/'other' already do.
ALTER TABLE comhub_contacts DROP CONSTRAINT IF EXISTS comhub_contacts_tag_check;
ALTER TABLE comhub_contacts
  ADD CONSTRAINT comhub_contacts_tag_check
    CHECK (tag IS NULL OR tag IN ('client', 'team', 'lead', 'potential_lead', 'spam', 'vendor', 'other'));

NOTIFY pgrst, 'reload schema';
