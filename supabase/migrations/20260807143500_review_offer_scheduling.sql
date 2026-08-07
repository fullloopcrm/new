-- Adds delayed review-offer scheduling to ratings, so a 4-5 rating can
-- trigger a separate "$20 off, leave a Google review" text ~10 minutes
-- later without blocking payment (which already goes out unconditionally
-- in the 30-min-alert bill text). A dedicated cron polls review_offer_due_at
-- and stamps review_offer_sent_at once the text goes out, so a booking's
-- review offer can never double-fire.

BEGIN;

ALTER TABLE ratings ADD COLUMN IF NOT EXISTS review_offer_due_at timestamptz;
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS review_offer_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ratings_review_offer_due
  ON ratings (review_offer_due_at)
  WHERE review_offer_due_at IS NOT NULL AND review_offer_sent_at IS NULL;

COMMIT;
