-- Connect: Slack-style community chat
-- Channels, messages, and read cursors per tenant

CREATE TABLE IF NOT EXISTS connect_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'client', 'referrer', 'custom')),
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_connect_channels_tenant ON connect_channels(tenant_id);
CREATE UNIQUE INDEX idx_connect_channels_general ON connect_channels(tenant_id) WHERE type = 'general';
CREATE UNIQUE INDEX idx_connect_channels_client ON connect_channels(tenant_id, client_id) WHERE type = 'client' AND client_id IS NOT NULL;

ALTER TABLE connect_channels ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS connect_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES connect_channels(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('owner', 'team', 'client')),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_connect_messages_channel ON connect_messages(channel_id, created_at);
CREATE INDEX idx_connect_messages_tenant ON connect_messages(tenant_id);

ALTER TABLE connect_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS connect_read_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES connect_channels(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  reader_type TEXT NOT NULL CHECK (reader_type IN ('owner', 'team', 'client')),
  reader_id TEXT NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_id, reader_type, reader_id)
);

CREATE INDEX idx_connect_cursors_reader ON connect_read_cursors(reader_type, reader_id);

ALTER TABLE connect_read_cursors ENABLE ROW LEVEL SECURITY;
