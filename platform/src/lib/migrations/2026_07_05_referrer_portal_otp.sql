-- Referrer portal OTP auth.
-- The referrer earnings dashboard (/referral/[code]) previously required no auth:
-- the code in the URL was the only credential, and that same code was handed out
-- as the "share link" — so anyone a referrer recruited could see their earnings and
-- client names. We gate the dashboard behind an email OTP. These columns hold the
-- pending one-time code (hashed) and its expiry for a referrer mid-login.
ALTER TABLE referrers ADD COLUMN IF NOT EXISTS otp_hash text;
ALTER TABLE referrers ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz;
