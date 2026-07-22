'use client'

import BookingsAdmin from './BookingsAdmin'

// Bookings is its own page now — the old Calendar/Map/By-Team/Capacity tab
// switcher here duplicated Schedule (/dashboard/calendar) and, for Map/By-Team/
// Capacity, had no render branch at all (dead tabs, clicking them showed
// nothing). BookingsAdmin already brings its own header + stats.
export default function BookingsPage() {
  return <BookingsAdmin />
}
