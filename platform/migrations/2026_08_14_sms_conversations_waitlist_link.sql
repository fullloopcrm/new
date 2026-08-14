-- Links an SMS conversation to the real waitlist row it produced. The SMS
-- agent (Selena/Yinez) used to only flag sms_conversations.outcome='waitlisted'
-- without ever writing a real `waitlist` row — invisible to the dashboard's
-- Waiting List panel and the Bookings "Pending/Waitlist" badge. Now that it
-- writes a real row via src/lib/waitlist.ts, this column lets /api/waitlist's
-- GET skip the legacy outcome='waitlisted' union for conversations that
-- already have a proper waitlist entry, so the same lead doesn't double-list.
ALTER TABLE sms_conversations ADD COLUMN IF NOT EXISTS waitlist_id UUID REFERENCES waitlist(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
