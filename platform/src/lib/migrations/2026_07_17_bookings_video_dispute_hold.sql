-- 2026_07_17_bookings_video_dispute_hold.sql
-- W1 fresh-ground finding (2026-07-17). cron/cleanup-videos deletes any
-- walkthrough/final video older than 30 days, with a documented escape
-- hatch: admin/docs literally instructs "Add [DISPUTE] to booking notes to
-- prevent deletion." That marker lives in the SAME free-text `notes` field
-- PUT /api/bookings/[id] lets any admin overwrite wholesale for any
-- unrelated reason (correcting a typo, adding a scheduling note) -- same
-- fragile-marker-in-notes shape as [THANKYOU_SENT] fixed earlier this
-- session, except here erasing the marker doesn't cause a duplicate send,
-- it silently deletes payment-dispute evidence with no way to recover it.
--
-- Fix (code, same commit): a dedicated boolean column, set via its own
-- toggle in the booking detail page's Job Videos panel -- never touched by
-- the notes textarea, so an unrelated notes edit can no longer clobber it.
-- cron/cleanup-videos checks this column OR the legacy notes marker (so
-- bookings already flagged the old way stay protected until an admin
-- re-flags them with the new toggle).

alter table bookings
  add column if not exists video_dispute_hold boolean not null default false;

comment on column bookings.video_dispute_hold is
  'Admin-set hold that exempts a booking''s walkthrough/final videos from the 30-day cron/cleanup-videos auto-delete. Set via its own toggle (PUT /api/bookings/[id]) -- not the notes field, which cron/cleanup-videos previously keyed off a [DISPUTE] substring that any unrelated notes edit could silently erase.';
