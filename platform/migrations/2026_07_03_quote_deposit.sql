-- Deposit on proposals (2026-07-03)
-- The proposal creator can attach a deposit: none, a flat dollar amount, or a
-- percent of the total. The customer pays it on the public quote page (Stripe).
-- deposit_cents is the resolved amount (computed at create/update time so the
-- public page and checkout never have to recompute). paid_* track collection.
-- Idempotent.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deposit_type text NOT NULL DEFAULT 'none',   -- 'none' | 'flat' | 'percent'
  ADD COLUMN IF NOT EXISTS deposit_value integer NOT NULL DEFAULT 0,    -- flat: cents; percent: basis points (e.g. 2500 = 25%)
  ADD COLUMN IF NOT EXISTS deposit_cents integer NOT NULL DEFAULT 0,    -- resolved amount due
  ADD COLUMN IF NOT EXISTS deposit_paid_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_session_id text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_deposit_type_chk') THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_deposit_type_chk CHECK (deposit_type IN ('none', 'flat', 'percent'));
  END IF;
END $$;
