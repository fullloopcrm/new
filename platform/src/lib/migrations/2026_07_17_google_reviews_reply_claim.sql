-- 2026_07_17_google_reviews_reply_claim.sql
-- W1 fresh-ground finding (2026-07-17), new surface: cron/auto-reply-reviews
-- (via lib/google-reviews.ts autoReplyReviews), not a continuation of the
-- bookings-marker or deals-marker families closed earlier this session.
--
-- autoReplyReviews selected reviews with `reply IS NULL`, generated an AI
-- reply (Anthropic call), posted it to Google (PUT .../reviews/{id}/reply),
-- and only THEN wrote `reply` locally -- a classic check-then-act race, same
-- bug class as this session's other claim-before-send fixes. Two overlapping
-- invocations (a retried cron delivery, a manual re-trigger via the same
-- CRON_SECRET while a prior run is still mid-flight) can both read the same
-- unreplied review, both burn a real Anthropic API call generating a reply,
-- and both PUT to Google's reply endpoint -- which is a last-write-wins
-- overwrite slot, not an append, so the two invocations can also leave the
-- local `reply` column showing different text than what's actually live on
-- Google (whichever PUT call landed last), a silent split-brain between the
-- dashboard's review list and the public review.
--
-- Fix (code, same commit): claim via a dedicated nullable column BEFORE
-- generating/posting, reverted back to NULL if generation or posting fails
-- so the review is still retried on the next cron pass (unlike this
-- session's usual one-shot *_sent_at markers, losing the retry here isn't
-- an acceptable tradeoff -- an unanswered review has no other trigger to
-- catch it later). Deliberately a SEPARATE column from `reply` itself
-- rather than reusing `reply` as the sentinel: `reply` must only ever hold
-- real posted-reply text or NULL, never a transient in-flight marker, since
-- it's also read directly by the dashboard review list and re-synced
-- (read-only, never overwritten by the claim) from Google's own reply data
-- by cron/sync-google-reviews.

alter table google_reviews
  add column if not exists reply_claimed_at timestamptz;

comment on column google_reviews.reply_claimed_at is
  'Set immediately before cron/auto-reply-reviews generates+posts an AI reply, claimed via compare-and-swap (WHERE reply_claimed_at IS NULL) so two overlapping invocations cannot both burn an Anthropic call and both PUT a reply to Google for the same review. Reverted to NULL if generation/posting fails, so the review is retried on the next pass instead of being silently stuck forever. Distinct from `reply` (the actual posted text, or NULL) so a claim in flight never gets exposed to readers of `reply` (dashboard review list, cron/sync-google-reviews).';
