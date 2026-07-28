import { describe, it, expect } from 'vitest'
import { generateRecurringDates } from './_recurring'

/**
 * _recurring.ts's generateRecurringDates — the admin New/Edit Booking UI's
 * "repeat end"-aware date generator (POSTed straight into
 * /api/admin/recurring-schedules as the initial occurrence batch). An off-by-
 * one here means a real recurring series is created missing its own first
 * visit.
 */

describe('generateRecurringDates — monthly_day includes the anchor month occurrence', () => {
  it('includes the start date itself as the first generated date', () => {
    // 2026-08-15 is the 3rd Saturday of August 2026 -- by construction, the
    // Nth-weekday-of-month the monthly_day branch derives FROM this start
    // date always resolves to the start date itself in the anchor month.
    const dates = generateRecurringDates('2026-08-15', true, 'monthly_day', 'after', 3, '', 1)

    expect(dates[0]).toBe('2026-08-15')
    expect(dates).toHaveLength(3)
  })

  it('generates the 3rd Saturday for the following months after the anchor', () => {
    const dates = generateRecurringDates('2026-08-15', true, 'monthly_day', 'after', 3, '', 1)

    // 3rd Saturday of Sep 2026 = Sep 19, 3rd Saturday of Oct 2026 = Oct 17
    expect(dates).toEqual(['2026-08-15', '2026-09-19', '2026-10-17'])
  })
})
