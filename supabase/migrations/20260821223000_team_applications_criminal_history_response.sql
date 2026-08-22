-- PA and FL have no statewide ban-the-box law for private employers, so
-- their apply forms (pennsylvania-maid, the-florida-maid) ask this directly
-- at application time instead of post-offer. NY/NJ/CT tenants stay on the
-- post-offer team_members.criminal_history_response flow (see
-- 20260821213000_team_members_criminal_history_disclosure.sql) — this
-- column is simply left null for their applications.

ALTER TABLE team_applications
  ADD COLUMN IF NOT EXISTS criminal_history_response text;
