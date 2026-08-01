-- Venmo, unlike Zelle (zelle_email) and Apple Cash (apple_cash_phone), had no
-- column to hold the tenant's actual payment handle -- 'venmo' existed as a
-- selectable payment_methods checkbox with nowhere to store the @handle a
-- client would actually pay to. See tenant-profile.ts's venmoHandle field.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS venmo_handle text;
