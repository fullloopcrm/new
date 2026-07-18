-- 2026_07_18_team_direct_messages.sql
-- New feature: team-to-team direct messaging inside /dashboard/messages.
-- Additive-only, brand-new table -- no existing data to backfill, and the
-- existing Full Loop thread (tenant_owner_messages, admin<->owner) is
-- untouched. This is a separate, parallel thread type.
--
-- IDENTITY NOTE: every dashboard session resolves to one of three actor
-- shapes (see src/lib/tenant-query.ts getTenantForRequest): a Clerk user id
-- (owner web login), the literal 'admin' (Full Loop PIN-impersonating the
-- owner), or a team_members.id (team member PIN login on the tenant's own
-- domain). Only the third shape is already a team_members row, so
-- sender/recipient here are BOTH hard FKs to team_members(id) -- the app
-- layer (src/lib/team-messages.ts resolveActorTeamMemberId) resolves a
-- Clerk/admin owner session to that tenant's founding team_members row
-- (activate-tenant.ts always seeds one, email = tenant.owner_email) before
-- insert, rather than the schema accepting a loose, unjoinable actor id.
--
-- NOT RUN -- leader applies on prod after Jeff approves.

CREATE TABLE IF NOT EXISTS team_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  recipient_team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT team_direct_messages_not_self CHECK (sender_team_member_id <> recipient_team_member_id)
);

-- Thread lookups query "every message between me and this other person" --
-- i.e. (sender=A AND recipient=B) OR (sender=B AND recipient=A) -- so index
-- both directions plus the tenant scope.
CREATE INDEX IF NOT EXISTS idx_team_direct_messages_sender
  ON team_direct_messages (tenant_id, sender_team_member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_team_direct_messages_recipient
  ON team_direct_messages (tenant_id, recipient_team_member_id, created_at);

-- Unread-count-per-conversation lookups.
CREATE INDEX IF NOT EXISTS idx_team_direct_messages_unread
  ON team_direct_messages (recipient_team_member_id, sender_team_member_id)
  WHERE read_at IS NULL;

COMMENT ON TABLE team_direct_messages IS
  'Team-to-team direct messages between two team_members of the same tenant. Parallel to, and independent of, tenant_owner_messages (the pinned Full Loop admin<->owner thread).';
COMMENT ON COLUMN team_direct_messages.sender_team_member_id IS
  'Always a real team_members.id. A Clerk/admin owner session resolves to that tenant''s founding team_members row first -- see src/lib/team-messages.ts resolveActorTeamMemberId.';
