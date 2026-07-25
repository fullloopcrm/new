-- Loop Connect unification (Messages folded into Loop Connect):
-- 1. tenant_owner_messages (the Full Loop Support thread) gets the same
--    body_en/body_es pattern as connect_messages so it renders translated
--    everywhere, same as every other Loop Connect thread.
-- 2. connect_channel_members backs admin-created group/broadcast channels
--    (mass messaging) -- a 'custom' channel with explicit team_member
--    recipients, so only those members (+ admin) see and receive it.

ALTER TABLE tenant_owner_messages ADD COLUMN IF NOT EXISTS body_en TEXT;
ALTER TABLE tenant_owner_messages ADD COLUMN IF NOT EXISTS body_es TEXT;

CREATE TABLE IF NOT EXISTS connect_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES connect_channels(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_connect_channel_members_channel ON connect_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_connect_channel_members_team_member ON connect_channel_members(team_member_id);

-- Same tenant_isolation policy shape as every other tenant table
-- (see 2026_07_11_rls_tenant_tables.sql's match_expr).
ALTER TABLE connect_channel_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON connect_channel_members;
CREATE POLICY tenant_isolation ON connect_channel_members FOR ALL
  USING ((current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text)
  WITH CHECK ((current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id') = (tenant_id)::text);
