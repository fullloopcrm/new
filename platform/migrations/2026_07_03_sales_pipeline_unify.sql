-- Sales pipeline unification (2026-07-03)
-- Locks the deal stage vocabulary to ONE spine for all trades and adds the
-- fields that let booking-mode deals mirror into the Sale column and auto-sync.
--
-- Spine (single deals.stage field):
--   new → qualifying → quoted → pending → sold → lost
-- The board renders 4 columns: New · Qualifying · Quoted · Sale
-- where {pending, sold, lost} group under "Sale" with status chips.
--
-- mode:        'sales'  = quoted trades, worked manually through the stages
--              'booking'= instant trades; deal is created at 'pending' and its
--                         stage is driven by the linked booking's lifecycle
--                         (confirmed → sold, cancelled → lost).
-- booking_id:  link from a mirror deal back to its booking (null for pure
--              sales-mode deals). ON DELETE SET NULL so deleting a booking
--              never orphans/deletes the revenue record.
--
-- Idempotent: safe to re-run. Column adds are guarded; the stage remap only
-- touches rows still on legacy values.

-- 1) New columns -------------------------------------------------------------
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'sales';

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS booking_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deals_booking_id_fkey'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_booking_id ON public.deals(booking_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON public.deals(tenant_id, stage);

-- 2) Remap legacy stage values → the locked spine ---------------------------
-- Legacy vocabularies seen in code/data:
--   pipeline.ts: lead, qualified, proposal, negotiation, won, lost
--   sales page:  new, contacted, qualified, quoted, negotiating, booked
UPDATE public.deals SET stage = 'new'        WHERE stage IN ('lead');
UPDATE public.deals SET stage = 'qualifying' WHERE stage IN ('contacted', 'qualified');
UPDATE public.deals SET stage = 'quoted'     WHERE stage IN ('proposal', 'negotiation', 'negotiating');
UPDATE public.deals SET stage = 'sold'       WHERE stage IN ('won', 'booked');
-- 'new', 'quoted', 'lost' already conform. Any stray/unknown value → 'new'
-- so the CHECK constraint below can be applied cleanly.
UPDATE public.deals
  SET stage = 'new'
  WHERE stage NOT IN ('new', 'qualifying', 'quoted', 'pending', 'sold', 'lost');

-- 3) Constrain to the locked spine ------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deals_stage_spine_chk'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_stage_spine_chk
      CHECK (stage IN ('new', 'qualifying', 'quoted', 'pending', 'sold', 'lost'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deals_mode_chk'
  ) THEN
    ALTER TABLE public.deals
      ADD CONSTRAINT deals_mode_chk
      CHECK (mode IN ('booking', 'sales'));
  END IF;
END $$;
