-- Waitlist entries now also create a real `bookings` row (status='pending',
-- source='waitlist') so the request sits in the Bookings "Pending Approval"
-- list like every other booking, instead of only living in the separate
-- waitlist table. This column links the two records together.
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
