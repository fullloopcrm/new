-- Smart-scheduling upgrade spec, Part 4 item 4: override tracking. Logs
-- every time an admin's chosen team member differs from what
-- scoreTeamForBooking would have suggested. No UI reads this yet — it's
-- training signal for whether the algorithm and human judgment are
-- diverging on a specific cleaner (spec's own framing). Nothing here ever
-- blocks or slows down booking creation — see lib/scheduling-override-log.ts.

CREATE TABLE IF NOT EXISTS scheduling_overrides (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  booking_id                uuid REFERENCES bookings(id) ON DELETE SET NULL,
  suggested_team_member_id  uuid REFERENCES team_members(id) ON DELETE SET NULL,
  suggested_score           numeric,
  chosen_team_member_id     uuid NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  source                    text NOT NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduling_overrides_tenant ON scheduling_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_overrides_chosen ON scheduling_overrides(chosen_team_member_id);

ALTER TABLE scheduling_overrides ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
