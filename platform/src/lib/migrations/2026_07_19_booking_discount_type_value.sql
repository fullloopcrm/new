-- Bookings store `discount_enabled` but never the actual discount
-- type/value used -- price is baked in once at creation and never
-- traceable back to "10% off" vs "$10 off" afterward. Reopening a
-- discounted booking for edit had to GUESS the discount from a
-- price-ratio (booking.price vs hours*rate), which only ever produces a
-- percent and silently corrupts a real flat-dollar discount into a wrong
-- percent value if the admin re-saves (nycmaid hit + fixed this exact
-- class in 6ec48424). These columns let create/edit persist and read
-- back the real value instead of guessing.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS discount_type TEXT CHECK (discount_type IN ('percent', 'dollar')),
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC;
