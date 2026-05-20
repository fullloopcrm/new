-- nycmaid parity: full comhub schema
-- Sources: nycmaid migrations 2026_05_07_comhub.sql, 2026_05_08_comhub_{author_id,channels,membership,phase2,takeover,voice}.sql
-- Substitutions for multi-tenancy:
--   admin_users(id) → tenant_members(id) (Clerk-backed in fullloop)
--   cleaners(id)    → team_members(id)
--   + tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE everywhere
-- Triggers + helper functions ported with tenant_id parameter where needed.

-- ─── comhub_contacts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  email TEXT,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comhub_contacts_tenant_phone
  ON comhub_contacts(tenant_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comhub_contacts_tenant_email
  ON comhub_contacts(tenant_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comhub_contacts_tenant ON comhub_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comhub_contacts_client ON comhub_contacts(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comhub_contacts_team_member ON comhub_contacts(team_member_id) WHERE team_member_id IS NOT NULL;

-- ─── comhub_threads ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES comhub_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email','voice','web','admin','telegram','internal')),
  kind TEXT NOT NULL DEFAULT 'contact' CHECK (kind IN ('contact','channel')),
  name TEXT,
  slug TEXT,
  description TEXT,
  archived_at TIMESTAMPTZ,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','snoozed','closed')),
  disposition TEXT CHECK (disposition IS NULL OR disposition IN ('waiting_customer','waiting_admin','closed_booked','closed_lost','closed_spam')),
  assignee_id UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER NOT NULL DEFAULT 0,
  snoozed_until TIMESTAMPTZ,
  bot_paused_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comhub_threads_open_contact_channel
  ON comhub_threads(tenant_id, contact_id, channel) WHERE status != 'closed' AND contact_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comhub_channel_slug
  ON comhub_threads(tenant_id, slug) WHERE kind = 'channel' AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comhub_threads_tenant_last ON comhub_threads(tenant_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_comhub_threads_disposition ON comhub_threads(tenant_id, disposition) WHERE disposition IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comhub_threads_paused ON comhub_threads(bot_paused_until) WHERE bot_paused_until IS NOT NULL;

-- ─── comhub_messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES comhub_threads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES comhub_contacts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms','email','voice','web','admin','telegram','internal')),
  direction TEXT NOT NULL CHECK (direction IN ('in','out','auto','system')),
  author TEXT NOT NULL CHECK (author IN ('customer','yinez','admin','system','cleaner')),
  author_id UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  body TEXT,
  media_urls TEXT[],
  subject TEXT,
  from_address TEXT,
  to_address TEXT,
  external_id TEXT,
  raw_payload JSONB,
  metadata JSONB,
  source_table TEXT,
  source_id UUID,
  flagged_for_review BOOLEAN NOT NULL DEFAULT false,
  flagged_reason TEXT,
  flagged_at TIMESTAMPTZ,
  flagged_by UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comhub_messages_thread ON comhub_messages(thread_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comhub_messages_contact ON comhub_messages(contact_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comhub_messages_tenant_channel ON comhub_messages(tenant_id, channel, sent_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_comhub_messages_source ON comhub_messages(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_comhub_messages_author ON comhub_messages(author_id) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comhub_messages_flagged ON comhub_messages(flagged_at DESC) WHERE flagged_for_review = true;

-- ─── comhub_channel_members ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_channel_members (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES comhub_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  PRIMARY KEY (thread_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comhub_chmem_user ON comhub_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_comhub_chmem_tenant ON comhub_channel_members(tenant_id);

-- ─── comhub_mentions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES comhub_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES comhub_messages(id) ON DELETE CASCADE,
  mentioned_by UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comhub_mentions_user_unread ON comhub_mentions(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comhub_mentions_tenant ON comhub_mentions(tenant_id);

-- ─── comhub_templates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT,
  hotkey TEXT,
  created_by UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_comhub_templates_tenant ON comhub_templates(tenant_id);

-- ─── comhub_active_calls ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_active_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_call_id TEXT NOT NULL UNIQUE,
  admin_call_id TEXT,
  thread_id UUID NOT NULL REFERENCES comhub_threads(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES comhub_contacts(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  admin_phone TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  status TEXT NOT NULL CHECK (status IN ('ringing','bridged','voicemail','ended')),
  hold BOOLEAN NOT NULL DEFAULT FALSE,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  recording_id TEXT,
  recording_url TEXT,
  transcript TEXT,
  voicemail_message_id UUID REFERENCES comhub_messages(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_secs INTEGER,
  hangup_cause TEXT,
  initiated_by_admin_id UUID REFERENCES tenant_members(id) ON DELETE SET NULL,
  raw_metadata JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_comhub_active_calls_tenant_status ON comhub_active_calls(tenant_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_comhub_active_calls_thread ON comhub_active_calls(thread_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_comhub_active_calls_admin ON comhub_active_calls(admin_call_id) WHERE admin_call_id IS NOT NULL;

-- ─── comhub_admin_phones ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_admin_phones (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  label TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_id)
);
CREATE INDEX IF NOT EXISTS idx_comhub_admin_phones_tenant ON comhub_admin_phones(tenant_id);

-- ─── comhub_missed_call_sms ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_missed_call_sms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  thread_id UUID REFERENCES comhub_threads(id) ON DELETE CASCADE,
  active_call_id UUID REFERENCES comhub_active_calls(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('no_answer','voicemail','hangup_before_pickup')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comhub_missed_call_sms_phone_recent ON comhub_missed_call_sms(tenant_id, customer_phone, sent_at DESC);

-- ─── comhub_admin_presence ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_admin_presence (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  sip_username TEXT NOT NULL,
  sip_address TEXT,
  device_label TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','busy','away','offline')),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  raw_metadata JSONB DEFAULT '{}'::jsonb,
  PRIMARY KEY (admin_id)
);
CREATE INDEX IF NOT EXISTS idx_comhub_admin_presence_live ON comhub_admin_presence(tenant_id, last_seen_at DESC, status) WHERE status <> 'offline';

-- ─── comhub_admin_voice_settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_admin_voice_settings (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  ring_strategy TEXT NOT NULL DEFAULT 'browser_then_cell' CHECK (ring_strategy IN ('browser_only','cell_only','browser_then_cell','simultaneous')),
  fallback_cell_phone TEXT,
  caller_id_mode TEXT NOT NULL DEFAULT 'show_customer' CHECK (caller_id_mode IN ('show_customer','show_business')),
  auto_record BOOLEAN NOT NULL DEFAULT TRUE,
  auto_transcribe BOOLEAN NOT NULL DEFAULT TRUE,
  do_not_disturb_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_id)
);

-- ─── comhub_softphone_calls ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS comhub_softphone_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  active_call_id UUID REFERENCES comhub_active_calls(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES tenant_members(id) ON DELETE CASCADE,
  sip_username TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  thread_id UUID REFERENCES comhub_threads(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES comhub_contacts(id) ON DELETE SET NULL,
  call_control_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','answered','ended','failed'))
);
CREATE INDEX IF NOT EXISTS idx_comhub_softphone_calls_admin ON comhub_softphone_calls(admin_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_comhub_softphone_calls_tenant ON comhub_softphone_calls(tenant_id);

-- ─── helper: get-or-create contact by phone (tenant-scoped) ──────
CREATE OR REPLACE FUNCTION comhub_get_or_create_contact_by_phone(
  p_tenant_id UUID,
  p_phone TEXT,
  p_name TEXT DEFAULT NULL,
  p_client_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_contact_id UUID;
  v_email TEXT;
  v_name_lookup TEXT;
  v_client_id UUID := p_client_id;
  v_team_member_id UUID;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN RETURN NULL; END IF;
  IF v_client_id IS NOT NULL THEN
    PERFORM 1 FROM clients WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN v_client_id := NULL; END IF;
  END IF;
  SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND phone = p_phone LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    UPDATE comhub_contacts SET name = COALESCE(name, p_name), client_id = COALESCE(client_id, v_client_id), updated_at = now() WHERE id = v_contact_id;
    RETURN v_contact_id;
  END IF;
  IF v_client_id IS NULL THEN
    SELECT id, email, name INTO v_client_id, v_email, v_name_lookup FROM clients WHERE tenant_id = p_tenant_id AND phone = p_phone LIMIT 1;
  ELSE
    SELECT email, name INTO v_email, v_name_lookup FROM clients WHERE id = v_client_id LIMIT 1;
  END IF;
  IF v_client_id IS NULL THEN
    SELECT id INTO v_team_member_id FROM team_members WHERE tenant_id = p_tenant_id AND phone = p_phone LIMIT 1;
  END IF;
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND lower(email) = lower(v_email) LIMIT 1;
    IF v_contact_id IS NOT NULL THEN
      UPDATE comhub_contacts
         SET phone = COALESCE(phone, p_phone), name = COALESCE(name, p_name, v_name_lookup),
             client_id = COALESCE(client_id, v_client_id), team_member_id = COALESCE(team_member_id, v_team_member_id),
             updated_at = now()
       WHERE id = v_contact_id;
      RETURN v_contact_id;
    END IF;
  END IF;
  INSERT INTO comhub_contacts (tenant_id, phone, email, name, client_id, team_member_id)
    VALUES (p_tenant_id, p_phone, v_email, COALESCE(p_name, v_name_lookup), v_client_id, v_team_member_id)
    RETURNING id INTO v_contact_id;
  RETURN v_contact_id;
END;
$$;

-- ─── helper: get-or-create thread (tenant-scoped) ────────────────
CREATE OR REPLACE FUNCTION comhub_get_or_create_thread(
  p_tenant_id UUID, p_contact_id UUID, p_channel TEXT
) RETURNS UUID
LANGUAGE plpgsql AS $$
DECLARE
  v_thread_id UUID;
BEGIN
  SELECT id INTO v_thread_id FROM comhub_threads
   WHERE tenant_id = p_tenant_id AND contact_id = p_contact_id AND channel = p_channel AND status != 'closed'
   LIMIT 1;
  IF v_thread_id IS NOT NULL THEN RETURN v_thread_id; END IF;
  INSERT INTO comhub_threads (tenant_id, contact_id, channel) VALUES (p_tenant_id, p_contact_id, p_channel) RETURNING id INTO v_thread_id;
  RETURN v_thread_id;
END;
$$;

-- ─── trigger: mirror sms_conversation_messages → comhub_messages ─
CREATE OR REPLACE FUNCTION comhub_mirror_sms_message() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_phone TEXT; v_name TEXT; v_client_id UUID; v_tenant_id UUID;
  v_contact_id UUID; v_thread_id UUID;
  v_direction TEXT; v_author TEXT; v_preview TEXT;
BEGIN
  SELECT phone, name, client_id, tenant_id INTO v_phone, v_name, v_client_id, v_tenant_id
    FROM sms_conversations WHERE id = NEW.conversation_id LIMIT 1;
  IF v_phone IS NULL OR v_tenant_id IS NULL THEN RETURN NEW; END IF;
  v_contact_id := comhub_get_or_create_contact_by_phone(v_tenant_id, v_phone, v_name, v_client_id);
  IF v_contact_id IS NULL THEN RETURN NEW; END IF;
  v_thread_id := comhub_get_or_create_thread(v_tenant_id, v_contact_id, 'sms');
  IF NEW.direction = 'inbound' THEN v_direction := 'in'; v_author := 'customer';
  ELSE v_direction := 'auto'; v_author := 'yinez'; END IF;
  v_preview := substr(coalesce(NEW.message,''), 1, 140);
  INSERT INTO comhub_messages (tenant_id, thread_id, contact_id, channel, direction, author, body, sent_at, source_table, source_id)
    VALUES (v_tenant_id, v_thread_id, v_contact_id, 'sms', v_direction, v_author, NEW.message, NEW.created_at, 'sms_conversation_messages', NEW.id)
    ON CONFLICT (source_table, source_id) DO NOTHING;
  UPDATE comhub_threads
     SET last_message_at = NEW.created_at, last_message_preview = v_preview,
         unread_count = CASE WHEN v_direction = 'in' THEN unread_count + 1 ELSE unread_count END,
         updated_at = now()
   WHERE id = v_thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comhub_mirror_sms_message ON sms_conversation_messages;
CREATE TRIGGER trg_comhub_mirror_sms_message
  AFTER INSERT ON sms_conversation_messages
  FOR EACH ROW EXECUTE FUNCTION comhub_mirror_sms_message();

-- ─── RLS (service role only) ─────────────────────────────────────
ALTER TABLE comhub_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_active_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_admin_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_missed_call_sms ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_admin_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_admin_voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE comhub_softphone_calls ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
