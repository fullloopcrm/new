-- sms_conversations.booking_checklist: close a lost-update race.
--
-- lib/selena/core.ts updateChecklist() merges a partial checklist patch by
-- reading the current jsonb blob (loadChecklist), spreading the patch over
-- it in JS, then writing the merged blob back with a blind UPDATE. Every
-- inbound webhook message (SMS/Telegram/voice/email) runs this at least
-- once, often several times per turn. Two overlapping calls for the SAME
-- conversation -- a customer texting a second answer before Yinez's reply to
-- the first has landed, or a provider redelivering the same webhook while
-- the first delivery is still mid-flight (askSelena can take several
-- seconds) -- both read the same stale blob, and whichever write lands
-- second silently reverts whatever field the first call had just extracted:
-- the booking checklist loses a field the customer already gave, and Yinez
-- re-asks for it.
--
-- Fix: fold the read-merge-write into one atomic UPDATE (Postgres's `||`
-- does the same shallow merge the JS spread was doing), so concurrent calls
-- for the same conversation serialize on the row's write lock instead of
-- racing on a stale JS-side snapshot. No schema change.
CREATE OR REPLACE FUNCTION public.merge_sms_conversation_checklist(
  p_conversation_id uuid,
  p_patch jsonb
) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE public.sms_conversations
  SET booking_checklist = COALESCE(booking_checklist, '{}'::jsonb) || p_patch,
      updated_at = now()
  WHERE id = p_conversation_id
  RETURNING booking_checklist INTO v_result;

  RETURN v_result;
END;
$$;
