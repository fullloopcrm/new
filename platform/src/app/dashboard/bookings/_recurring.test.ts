import { describe, it, expect } from 'vitest'
import { generateRecurringDates } from './_recurring'

// This is the CLIENT-side generator BookingsAdmin.tsx's edit-modal/create-modal
// RecurringOptions preview both computes AND submits to create real schedule
// rows -- a separate, parallel reimplementation of the same monthly_date
// cadence @/lib/recurring.ts's generateRecurringDates provides server-side.

describe('generateRecurringDates (dashboard/bookings) — monthly_date', () => {
  it('same day-of-month across consecutive months for a low anchor day', () => {
    const out = generateRecurringDates('2026-01-05', true, 'monthly_date', 'after', 4, '', 0)
    expect(out).toEqual(['2026-01-05', '2026-02-05', '2026-03-05', '2026-04-05'])
  })

  it('a day-31 anchor clamps to each short month\'s real last day and does NOT permanently drift', () => {
    // FIX: `current.setMonth(current.getMonth() + 1)` used to chain off the
    // previous iteration's (possibly already-overflowed) result. Jan 31 ->
    // setMonth(+1) rolled to Mar 3 (Feb has no 31st, and no Feb entry was
    // ever emitted -- the month was skipped outright), and Mar 3 became the
    // new PERMANENT baseline for every month after (Apr 3, May 3, ...),
    // silently and forever shifting a client's recurring visit day. Every
    // month must independently clamp back to the true anchor (31) off a
    // day-1 base, not carry forward a prior month's overflow.
    const out = generateRecurringDates('2026-01-31', true, 'monthly_date', 'after', 5, '', 0)
    expect(out).toEqual([
      '2026-01-31',
      '2026-02-28', // Feb 2026 (non-leap) — clamped, not skipped
      '2026-03-31', // back to the true anchor day, not drifted to 3
      '2026-04-30', // Apr has only 30 days
      '2026-05-31', // still not drifted
    ])
  })

  it('stops at repeatEndDate rather than the count when repeatEnd is on_date', () => {
    const out = generateRecurringDates('2026-01-31', true, 'monthly_date', 'on_date', 0, '2026-03-15', 0)
    expect(out).toEqual(['2026-01-31', '2026-02-28'])
  })
})
