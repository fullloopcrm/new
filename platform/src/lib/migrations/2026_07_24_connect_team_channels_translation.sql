-- Loop Connect: private 1:1 team-member <-> admin channels, auto-translated
-- EN/ES messages. See migrations/connect-chat.sql for the base schema.

ALTER TABLE connect_channels DROP CONSTRAINT IF EXISTS connect_channels_type_check;
ALTER TABLE connect_channels ADD CONSTRAINT connect_channels_type_check
  CHECK (type IN ('general', 'client', 'referrer', 'custom', 'team'));

ALTER TABLE connect_channels ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_channels_team
  ON connect_channels(tenant_id, team_member_id) WHERE type = 'team' AND team_member_id IS NOT NULL;

-- Both language versions are stored on every message so each side (admin =
-- English, field team = Spanish) always renders in their own language
-- regardless of which language the sender actually typed in.
ALTER TABLE connect_messages ADD COLUMN IF NOT EXISTS body_en TEXT;
ALTER TABLE connect_messages ADD COLUMN IF NOT EXISTS body_es TEXT;
