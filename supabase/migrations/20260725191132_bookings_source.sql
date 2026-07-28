-- Adopted from legacy hand-run migration: 2026_07_25_bookings_source.sql
-- Original commit date (git first-add): 2026-07-25T15:11:31-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Bookings admin needs to show who/what created each booking (self-booked,
-- Yinez via text/voice, staff, sales conversion, import, or the recurring
-- cron) -- no such signal existed before. DEFAULT 'other' means every
-- existing row (and any insert path not yet updated to tag itself) gets a
-- safe, honest fallback rather than a silent NULL.
--
-- Valid values (app-level convention, not a DB constraint, matching how
-- status/payment_status are handled elsewhere in this table):
--   admin | client_portal | yinez_sms | yinez_voice | sales | import |
--   recurring_auto | other

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'other';
