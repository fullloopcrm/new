-- Corrects 2026_07_30_sms_to_phone.sql: to_phone was stored on sms_conversations
-- (set once, at conversation creation) and read from there in the mirror
-- trigger. That's wrong whenever the same open conversation carries messages
-- to more than one of a tenant's DIDs (confirmed live: 3 test texts from one
-- sender to 3 different NYC Maid numbers all landed in one conversation and
-- every comhub_messages row showed the FIRST message's number). to_phone now
-- lives on sms_conversation_messages itself (per message, set by the webhook
-- at insert time) and the trigger reads NEW.to_phone directly — no join.
-- sms_conversations.to_phone is left in place (harmless, unused by the
-- trigger now) rather than dropped, since it's otherwise-safe leftover state.

ALTER TABLE sms_conversation_messages ADD COLUMN IF NOT EXISTS to_phone TEXT;

CREATE OR REPLACE FUNCTION comhub_mirror_sms_message() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_phone TEXT; v_name TEXT; v_client_id UUID; v_tenant_id UUID;
  v_contact_id UUID; v_thread_id UUID;
  v_direction TEXT; v_author TEXT; v_preview TEXT;
  v_from_address TEXT; v_to_address TEXT;
BEGIN
  SELECT phone, name, client_id, tenant_id INTO v_phone, v_name, v_client_id, v_tenant_id
    FROM sms_conversations WHERE id = NEW.conversation_id LIMIT 1;
  IF v_phone IS NULL OR v_tenant_id IS NULL THEN RETURN NEW; END IF;
  v_contact_id := comhub_get_or_create_contact_by_phone(v_tenant_id, v_phone, v_name, v_client_id);
  IF v_contact_id IS NULL THEN RETURN NEW; END IF;
  v_thread_id := comhub_get_or_create_thread(v_tenant_id, v_contact_id, 'sms');
  IF NEW.direction = 'inbound' THEN
    v_direction := 'in'; v_author := 'customer';
    v_from_address := v_phone; v_to_address := NEW.to_phone;
  ELSE
    v_direction := 'auto'; v_author := 'yinez';
    v_from_address := NEW.to_phone; v_to_address := v_phone;
  END IF;
  v_preview := substr(coalesce(NEW.message,''), 1, 140);
  INSERT INTO comhub_messages (tenant_id, thread_id, contact_id, channel, direction, author, body, from_address, to_address, sent_at, source_table, source_id)
    VALUES (v_tenant_id, v_thread_id, v_contact_id, 'sms', v_direction, v_author, NEW.message, v_from_address, v_to_address, NEW.created_at, 'sms_conversation_messages', NEW.id)
    ON CONFLICT (source_table, source_id) DO NOTHING;
  UPDATE comhub_threads
     SET last_message_at = NEW.created_at, last_message_preview = v_preview,
         unread_count = CASE WHEN v_direction = 'in' THEN unread_count + 1 ELSE unread_count END,
         updated_at = now()
   WHERE id = v_thread_id;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
