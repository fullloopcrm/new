-- PROPOSED — not yet applied to prod. File-only per worker rules; leader runs
-- prod DDL after Jeff approves.
--
-- Closes a webhook-redelivery duplicate-processing gap in
-- POST /api/webhooks/telnyx (inbound SMS handler, `message.received`).
--
-- The handler has NO idempotency protection at all: it branches on message
-- text (owner-chat routing, STOP/START opt-out/in, YES/CONFIRM booking
-- confirmation, 1-5 star rating capture, general inbound + Selena AI
-- chatbot reply) with zero check against having already processed this
-- specific inbound message. Telnyx retries webhook deliveries when the
-- receiving endpoint doesn't ack with 2xx in time (a transient error, a
-- slow AI-chatbot branch exceeding response time, a cold start) -- a retried
-- delivery of the SAME message re-runs the whole branch tree a second time:
--   - STOP/START: re-sends the "You have been unsubscribed/re-subscribed"
--     confirmation SMS to the client a second time (real duplicate SMS).
--   - YES/CONFIRM: re-sets the same booking to 'confirmed' (idempotent DB
--     write, harmless) but this pattern doesn't generalize -- other
--     branches aren't idempotent.
--   - Rating capture (1-5): appends a SECOND [RATING:n] note to the
--     booking, sends the client a duplicate "Thank you" / low-rating reply,
--     and inserts a duplicate review_received notification (admin sees the
--     same rating reported twice).
--   - General inbound + Selena AI: duplicate client_sms_messages transcript
--     rows, duplicate admin sms_received notification, and (highest risk)
--     a duplicate real AI-generated reply sent back to the client from
--     Selena/Yinez -- the AI branch is exactly the kind of slow path likely
--     to cause the timeout that triggers Telnyx's retry in the first place.
--
-- Not fixed in this pass: this is a 753-line, many-branch handler for a
-- customer-facing channel (inbound SMS) -- properly closing this needs a
-- single idempotency check at the top of the message.received handler
-- (keyed on payload.id, the Telnyx message ID already used elsewhere in
-- this same file for delivery-status tracking) gating entry to every
-- branch below it, plus careful testing that the STOP/START/rating/AI
-- paths aren't broken by the added early-return. That's a bigger, riskier
-- change than the crons fixed this session and deserves dedicated review
-- rather than a quick end-of-session patch.
--
-- This migration adds the minimal building block: a small dedicated table
-- to claim a Telnyx inbound message ID exactly once, independent of
-- client_sms_messages (which doesn't store the Telnyx message ID today and
-- is a transcript log, not a claim mechanism).

CREATE TABLE IF NOT EXISTS telnyx_inbound_events (
  telnyx_message_id TEXT PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage once applied: at the top of the message.received branch, INSERT the
-- payload.id into this table (letting a 23505 on the primary key indicate
-- "already processed" -- return { received: true, duplicate: true }
-- immediately) BEFORE running any of the STOP/START/YES/rating/AI logic.
