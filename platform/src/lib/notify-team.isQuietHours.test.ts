import { describe, it, expect } from 'vitest'
import { isQuietHours } from './notify-team'

/**
 * notify-team.ts's DeliveryReport.quietHours label (surfaced to admins via
 * formatDeliveryReport, e.g. PUT /api/bookings/[id]/team's extras-added
 * notification) used `new Date().getHours()` -- the SERVER's local clock
 * (UTC on Vercel) -- instead of the team member's own ET wall-clock quiet
 * hours, mislabeling deliveries as "(quiet hrs)" or not by the ET/UTC gap.
 */
describe('isQuietHours — ET wall-clock, not server-local (UTC on Vercel)', () => {
  it('does NOT report quiet at 6pm ET even though the server clock (UTC) reads inside the 22:00-07:00 window', () => {
    const sixPmET = new Date('2026-07-17T22:00:00.000Z')
    expect(isQuietHours('22:00', '07:00', sixPmET)).toBe(false)
  })

  it('DOES report quiet at 4am ET even though the server clock (UTC) reads outside the 22:00-07:00 window', () => {
    const fourAmET = new Date('2026-07-17T08:00:00.000Z')
    expect(isQuietHours('22:00', '07:00', fourAmET)).toBe(true)
  })
})
