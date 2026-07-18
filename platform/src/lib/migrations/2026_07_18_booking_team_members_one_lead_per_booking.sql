-- 2026_07_18_booking_team_members_one_lead_per_booking.sql
-- P1 schema lane (W1). DB-level backstop enforcing the invariant every reader
-- of booking_team_members already assumes but nothing has ever guaranteed: AT
-- MOST ONE is_lead = true row per booking. Same discipline as
-- 2026_07_17_tenant_domains_one_primary_per_tenant.sql and
-- 2026_07_18_client_properties_one_primary_per_client.sql.
--
-- ROOT BUG: two independent write paths touch booking_team_members' is_lead
-- flag with no coordination between them:
--   - PUT /api/bookings/[id]/team  -- deletes ALL booking_team_members rows
--     for the booking, then inserts a fresh set (at most one is_lead=true row
--     BY CONSTRUCTION of a single call, but the delete+insert pair is not
--     atomic and the bookings.team_member_id write alongside it had no CAS).
--   - POST /api/team-portal/jobs/reassign -- deletes only the is_lead=true
--     row(s), then upserts a single new one.
-- Two concurrent calls (either two hits on the same route, or one of each)
-- can interleave their delete+insert/upsert pairs so that BOTH land an
-- is_lead=true row for the same booking_id, with different team_member_id
-- values -- the same "should be at-most-one, nothing enforces it" shape
-- already found and fixed twice this session for tenant_domains.is_primary
-- and client_properties.is_primary. Concrete blast radius here: GET
-- /api/bookings/[id]/team and closeout-summary both pick the lead via
-- `.find(r => r.is_lead)`, so which of the two rows "wins" as the displayed/
-- paid lead becomes row-order-dependent, and closeout-summary's tip-share
-- math (`member.is_lead ? tipShareRemainder : 0`) would double-count the
-- remainder if BOTH rows survive a naive future fix that doesn't dedupe.
-- The route-level fixes (CAS on bookings.team_member_id in
-- PUT /api/bookings/[id]/team, capturing + retrying reassign's previously
-- ignored upsert error, and converting either write's now-possible 23505
-- conflict into a 409) land in the same commit as this file; this migration
-- is the DB-level backstop so the invariant holds even if a future write path
-- makes the same coordination mistake.
--
-- DEDUPE-FIRST, same discipline as every other constraint added in this
-- session: a partial unique index added directly against live data that may
-- already violate it would just fail to apply. Step 1 picks exactly one row
-- to keep per booking (prefer the row whose team_member_id matches the
-- booking's OWN bookings.team_member_id -- the authoritative single-lead
-- column every non-multi-tech write path still maintains -- then lowest
-- position, then oldest created_at, then lowest id for a fully deterministic
-- tie-break) and clears is_lead on the rest. Step 2 adds the index.
--
-- File-only, not applied. Needs Jeff's approval + the leader to run it.

WITH ranked AS (
  SELECT
    btm.id,
    row_number() OVER (
      PARTITION BY btm.booking_id
      ORDER BY
        (btm.team_member_id = b.team_member_id) DESC,
        btm.position ASC,
        btm.created_at ASC,
        btm.id ASC
    ) AS rn
  FROM booking_team_members btm
  JOIN bookings b ON b.id = btm.booking_id
  WHERE btm.is_lead = true
)
UPDATE booking_team_members btm
SET is_lead = false
FROM ranked
WHERE btm.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS booking_team_members_one_lead_per_booking
  ON booking_team_members (booking_id)
  WHERE is_lead = true;
