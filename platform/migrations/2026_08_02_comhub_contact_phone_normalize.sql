-- comhub_get_or_create_contact_by_phone did exact-string phone matching with
-- zero normalization, while every TS caller (booking form, collect-info form)
-- normalizes to E.164 (+1XXXXXXXXXX) via normalizePhone() first. The
-- SMS-inbound mirror trigger feeds this function whatever raw phone string
-- sms_conversations.phone happens to hold, which was landing here WITHOUT
-- the +1 prefix (e.g. "8472174386"). Result: a contact who first texted in
-- got one comhub_contacts row keyed on the unprefixed phone, then later
-- filled out a booking/collect form and got a SECOND row keyed on the
-- E.164 phone with the real name -- the SMS thread stayed bound to the
-- first row forever, still showing the raw phone number as its name.
-- Confirmed live 2026-08-02: contact 75f60235 (phone "8472174386", name
-- still "18472174386") vs duplicate 3129618e (phone "+18472174386", name
-- "Matt Norton"), same client_id.
--
-- Fix: normalize phone to E.164 once, at the top of this function, so every
-- caller lands on the same row regardless of how it formatted its input.

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
  v_phone TEXT;
  v_digits TEXT;
BEGIN
  v_digits := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  IF v_digits = '' THEN RETURN NULL; END IF;
  IF length(v_digits) = 10 THEN
    v_phone := '+1' || v_digits;
  ELSIF length(v_digits) = 11 AND left(v_digits, 1) = '1' THEN
    v_phone := '+' || v_digits;
  ELSE
    v_phone := '+' || v_digits;
  END IF;

  IF v_client_id IS NOT NULL THEN
    PERFORM 1 FROM clients WHERE id = v_client_id AND tenant_id = p_tenant_id;
    IF NOT FOUND THEN v_client_id := NULL; END IF;
  END IF;
  SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND phone = v_phone LIMIT 1;
  IF v_contact_id IS NOT NULL THEN
    UPDATE comhub_contacts SET name = COALESCE(name, p_name), client_id = COALESCE(client_id, v_client_id), updated_at = now() WHERE id = v_contact_id;
    RETURN v_contact_id;
  END IF;
  IF v_client_id IS NULL THEN
    SELECT id, email, name INTO v_client_id, v_email, v_name_lookup FROM clients WHERE tenant_id = p_tenant_id AND phone = v_phone LIMIT 1;
  ELSE
    SELECT email, name INTO v_email, v_name_lookup FROM clients WHERE id = v_client_id LIMIT 1;
  END IF;
  IF v_client_id IS NULL THEN
    SELECT id INTO v_team_member_id FROM team_members WHERE tenant_id = p_tenant_id AND phone = v_phone LIMIT 1;
  END IF;
  IF v_email IS NOT NULL THEN
    SELECT id INTO v_contact_id FROM comhub_contacts WHERE tenant_id = p_tenant_id AND lower(email) = lower(v_email) LIMIT 1;
    IF v_contact_id IS NOT NULL THEN
      UPDATE comhub_contacts
         SET phone = COALESCE(phone, v_phone), name = COALESCE(name, p_name, v_name_lookup),
             client_id = COALESCE(client_id, v_client_id), team_member_id = COALESCE(team_member_id, v_team_member_id),
             updated_at = now()
       WHERE id = v_contact_id;
      RETURN v_contact_id;
    END IF;
  END IF;
  INSERT INTO comhub_contacts (tenant_id, phone, email, name, client_id, team_member_id)
    VALUES (p_tenant_id, v_phone, v_email, COALESCE(p_name, v_name_lookup), v_client_id, v_team_member_id)
    RETURNING id INTO v_contact_id;
  RETURN v_contact_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
