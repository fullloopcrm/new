-- Fair Chance / "ban-the-box" compliant criminal history disclosure.
--
-- NYC (Fair Chance Act), NJ, and other states/cities where tenants operate
-- restrict asking about criminal history on the initial job APPLICATION —
-- it can only be asked after a conditional offer. So this does NOT live on
-- team_applications (the public apply form). It lives on team_members,
-- captured once via a one-time gate in the team portal the first time a
-- newly-approved hire logs in (portal access = the conditional offer has
-- already been extended via /api/team-applications PUT status='approved').
--
-- criminal_history_disclosed_at gates the one-time portal prompt (see
-- src/app/team/layout.tsx + src/app/team/disclosure/page.tsx). Existing
-- members are backfilled to now() so this never retroactively blocks
-- currently-active staff who were already vetted under the prior process —
-- only newly-provisioned hires (disclosed_at null by default) see the prompt.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS criminal_history_response text,
  ADD COLUMN IF NOT EXISTS criminal_history_disclosed_at timestamptz;

UPDATE team_members
  SET criminal_history_disclosed_at = created_at
  WHERE criminal_history_disclosed_at IS NULL;
