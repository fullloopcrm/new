-- ComHub right panel: admins need to edit a contact's name/address inline,
-- including before the contact is linked to a client record (a pre-booking
-- lead). Name already lives on comhub_contacts; address did not.
ALTER TABLE comhub_contacts ADD COLUMN IF NOT EXISTS address TEXT;

NOTIFY pgrst, 'reload schema';
