-- Pipeline deal pinning (2026-07-18)
-- Lets an operator pin a deal so it sorts to the top of its stage column
-- regardless of stage_changed_at/age, and stays pinned as it moves between
-- stages (the column just changes; the pinned flag isn't touched by stage
-- moves in src/app/api/deals/[id]/stage/route.ts).
--
-- Idempotent: safe to re-run.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage_pinned ON public.deals(tenant_id, stage, pinned);
