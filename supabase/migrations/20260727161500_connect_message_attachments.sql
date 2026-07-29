-- Adopted from legacy hand-run migration: 2026_07_27_connect_message_attachments.sql
-- Original commit date (git first-add): 2026-07-27T12:15:00-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Loop Connect: photo attachments on messages, same pattern as booking_notes
-- (uploads to the shared 'uploads' storage bucket, public URLs stored as a
-- JSON array on the message row).

ALTER TABLE connect_messages ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
