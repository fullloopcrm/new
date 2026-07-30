-- Capture which of a tenant's DIDs an inbound SMS was actually sent to, and
-- mirror it into comhub_messages as from_address/to_address so ComHub can
-- show it. Both columns were always NULL before this — the mirror trigger
-- never set them. Additive + backward compatible: existing sms_conversations
-- rows have to_phone = NULL, so their already-mirrored comhub_messages rows
-- are untouched, and any future message on an old conversation just mirrors
-- with a NULL to_phone exactly as before.

ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS to_phone TEXT;

CREATE OR REPLACE FUNCTION comhub_mirror_sms_message() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_phone TEXT; v_to_phone TEXT; v_name TEXT; v_client_id UUID; v_tenant_id UUID;
  v_contact_id UUID; v_thread_id UUID;
  v_direction TEXT; v_author TEXT; v_preview TEXT;
  v_from_address TEXT; v_to_address TEXT;
BEGIN
  SELECT phone, to_phone, name, client_id, tenant_id INTO v_phone, v_to_phone, v_name, v_client_id, v_tenant_id
    FROM sms_conversations WHERE id = NEW.conversation_id LIMIT 1;
  IF v_phone IS NULL OR v_tenant_id IS NULL THEN RETURN NEW; END IF;
  v_contact_id := comhub_get_or_create_contact_by_phone(v_tenant_id, v_phone, v_name, v_client_id);
  IF v_contact_id IS NULL THEN RETURN NEW; END IF;
  v_thread_id := comhub_get_or_create_thread(v_tenant_id, v_contact_id, 'sms');
  IF NEW.direction = 'inbound' THEN
    v_direction := 'in'; v_author := 'customer';
    v_from_address := v_phone; v_to_address := v_to_phone;
  ELSE
    v_direction := 'auto'; v_author := 'yinez';
    v_from_address := v_to_phone; v_to_address := v_phone;
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
