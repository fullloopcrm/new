-- Admin -> client SMS reply on a feedback entry, and the client's reply back.
-- notes: append-only, human-readable thread ("[You -> Name, <time>] ..." /
-- "[Name reply, <time>] ...").
-- reply_requested_at: set when the admin sends a reply text; the inbound
-- Telnyx webhook matches a client's next SMS back to the most recent
-- client_feedback row for that client with reply_requested_at set (within 30
-- days), so the reply lands as a note on the right entry.
ALTER TABLE client_feedback ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE client_feedback ADD COLUMN IF NOT EXISTS reply_requested_at timestamptz;
