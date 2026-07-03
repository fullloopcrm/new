-- Link a proposal (quote) back to its deal (2026-07-03)
-- A lead carries through: new → qualifying → quoted, and at 'quoted' the operator
-- builds an ACTUAL proposal. That proposal hangs off the deal so the pipeline
-- shows the thread end-to-end (deal → quote → accept/decline → stage sync).
-- ON DELETE SET NULL so deleting a deal never destroys the revenue record.
-- Idempotent.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deal_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quotes_deal_id_fkey'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_deal_id_fkey
      FOREIGN KEY (deal_id) REFERENCES public.deals(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_quotes_deal_id ON public.quotes(deal_id);
