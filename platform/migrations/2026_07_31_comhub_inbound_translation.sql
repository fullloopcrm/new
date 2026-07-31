-- ComHub inbound auto-translation: store the detected source language and an
-- English translation alongside the original body. Original text is never
-- overwritten — `body` stays exactly what the customer sent.
ALTER TABLE comhub_messages ADD COLUMN IF NOT EXISTS detected_language TEXT;
ALTER TABLE comhub_messages ADD COLUMN IF NOT EXISTS translated_body TEXT;

NOTIFY pgrst, 'reload schema';
