-- The apply-form location picker (SERVICE_ZONES checkboxes) plus the
-- has-a-car / labor-only / travel-radius questions have been collected by
-- the frontend for a while, but POST /api/team-applications never persisted
-- them -- team_applications had no columns for them, so the applicant's
-- selections were silently discarded before ever reaching the database.
-- Adding the columns here; the API + provisioning fix land in the same
-- change so applicant-selected zones actually survive into the hired
-- team_members profile.

ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS service_zones TEXT[];
ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS has_car BOOLEAN;
ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS labor_only BOOLEAN;
ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS max_travel_minutes INTEGER;
ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE team_applications ADD COLUMN IF NOT EXISTS preferred_language TEXT;
