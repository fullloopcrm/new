-- Loop Connect: photo attachments on messages, same pattern as booking_notes
-- (uploads to the shared 'uploads' storage bucket, public URLs stored as a
-- JSON array on the message row).

ALTER TABLE connect_messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
