-- Per-tenant static Stripe Payment Link (NYC Maid parity).
-- nycmaid hardcodes one link (buy.stripe.com/8x2aEZ...) and appends
-- ?client_reference_id=<bookingId>; the Stripe webhook ties payment -> booking.
-- FullLoop stores it per tenant so each business collects to its own account
-- and its existing Stripe tracking/reporting/marketing pipeline stays intact.
--
-- Set for nycmaid after applying:
--   UPDATE tenants SET stripe_pay_link = 'https://buy.stripe.com/8x2aEZ4FL0wYfxe5f0fnO03'
--   WHERE slug = 'nycmaid';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_pay_link TEXT;
