-- Adopted from legacy hand-run migration: 2026_07_05_referrer_portal_otp.sql
-- Original commit date (git first-add): 2026-07-05T11:14:28-04:00
-- STATUS: part of the baseline. Assumed already live in prod as of
-- the 2026-07-28 cutover -- marked applied without re-running, per
-- docs/adr/0008-migration-tool-cutover.md. Do NOT re-run against prod.
-- Referrer portal OTP auth.
-- The referrer earnings dashboard (/referral/[code]) previously required no auth:
-- the code in the URL was the only credential, and that same code was handed out
-- as the "share link" — so anyone a referrer recruited could see their earnings and
-- client names. We gate the dashboard behind an email OTP. These columns hold the
-- pending one-time code (hashed) and its expiry for a referrer mid-login.
ALTER TABLE referrers ADD COLUMN IF NOT EXISTS otp_hash text;
ALTER TABLE referrers ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz;
