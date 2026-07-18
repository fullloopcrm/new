-- @-mention tagging on deal activities (2026-07-18)
-- The Note/Call/Text/Email composer on the sales pipeline card lets the
-- operator type "@Name" to tag a team member on a note. We store which
-- team_members were tagged so a future pass can notify them. Simple array
-- column (not a join table) since a note only ever has a handful of tags
-- and we don't need per-tag metadata (read state, etc.) yet. Idempotent.
ALTER TABLE public.deal_activities
  ADD COLUMN IF NOT EXISTS tagged_user_ids uuid[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_deal_activities_tagged_user_ids
  ON public.deal_activities USING gin (tagged_user_ids);
