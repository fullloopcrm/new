-- Connect: DM channels (admin to individual team member) and message
-- attachments. Additive to migrations/connect-chat.sql, safe to run after it.
-- Team to FullLoop platform admin already exists via tenant_owner_messages
-- (/admin/tenant-chats, /dashboard/messages), not duplicated here.

DO $$
DECLARE con_name text;
BEGIN
  SELECT conname INTO con_name FROM pg_constraint
    WHERE conrelid = 'connect_channels'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%type%IN%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE connect_channels DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE connect_channels
  ADD CONSTRAINT connect_channels_type_check
  CHECK (type IN ('general', 'client', 'referrer', 'custom', 'dm'));

ALTER TABLE connect_channels
  ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_channels_dm
  ON connect_channels(tenant_id, team_member_id) WHERE type = 'dm' AND team_member_id IS NOT NULL;

ALTER TABLE connect_messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
DECLARE con_name text;
BEGIN
  SELECT conname INTO con_name FROM pg_constraint
    WHERE conrelid = 'tenant_owner_messages'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%sender_role%IN%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE tenant_owner_messages DROP CONSTRAINT %I', con_name);
    EXECUTE format(
      'ALTER TABLE tenant_owner_messages ADD CONSTRAINT %I CHECK (sender_role IN (%L, %L, %L, %L, %L))',
      con_name, 'admin', 'owner', 'jefe', 'tenant_agent', 'team'
    );
  END IF;
END $$;
